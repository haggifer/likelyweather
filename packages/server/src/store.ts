// Postgres through Prisma. Keeps the prototype's function names so the collector, the city service and the API
// routes did not change when the JSON-file store was replaced.
import { getPrisma, Prisma } from '@fa/db/client'
import { ensureForecastPartitions, getWeekStart } from '@fa/db/partitions'
import { City, CityStatus, Run, RunOrigin } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { ModelId } from '@fa/shared/models'
import { ModelSeries, SeriesField } from '@fa/shared/variables'
import { isEqual } from 'es-toolkit'
import { getWindowSteps } from './window'

export interface SeriesGrid {
    steps: string[]
    models: Partial<Record<ModelId, ModelSeries>>
}

export interface SnapshotMeta {
    cityId: number
    issueTime: string
    runId: string
    origin: RunOrigin
    fetchedAt: string
    metnoLastModified?: string
}

// One run for one city on the hourly grid (`getWindowSteps`).
export interface Snapshot extends SnapshotMeta, SeriesGrid {}

type CityRow = Prisma.CityGetPayload<object>
type RunRow = Prisma.CollectionRunGetPayload<object>
type SnapshotRow = Prisma.SnapshotGetPayload<object>

const COLUMNS: Record<SeriesField, keyof Prisma.ForecastCreateManyInput> = {
    temp: 'tempC',
    wind: 'windMs',
    windDir: 'windDirDeg',
    pressure: 'pressureMsl',
    pressureSfc: 'pressureSfc',
    precip: 'precipMm',
    rain: 'rainMm',
    snow: 'snowCm',
}
const FIELDS = Object.keys(COLUMNS) as SeriesField[]
const CITY_ORDER: Prisma.CityOrderByWithRelationInput[] = [{ firstTrackedAt: 'asc' }, { id: 'asc' }]

const ensuredWeeks = new Map<number, Promise<void>>()

const toIso = (date: Date) => date.toISOString()

const toCity = (row: CityRow): City => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameLocal: (row.nameLocal ?? undefined) as City['nameLocal'],
    admin1: row.admin1 ?? undefined,
    country: row.country,
    countryCode: row.countryCode,
    lat: row.lat,
    lon: row.lon,
    elevationM: row.elevationM ?? undefined,
    timezone: row.timezone,
    population: row.population ?? undefined,
    status: row.status as CityStatus,
    availableModels: row.availableModels as ModelId[],
    firstTrackedAt: toIso(row.firstTrackedAt),
    lastViewedAt: toIso(row.lastViewedAt),
    viewCount: row.viewCount,
    runsCollected: row.runsCollected,
})

const fromCity = (city: City) => ({
    id: city.id,
    slug: city.slug,
    name: city.name,
    nameLocal: city.nameLocal ?? Prisma.JsonNull,
    admin1: city.admin1 ?? null,
    country: city.country,
    countryCode: city.countryCode,
    lat: city.lat,
    lon: city.lon,
    elevationM: city.elevationM ?? null,
    timezone: city.timezone,
    population: city.population ?? null,
    status: city.status,
    availableModels: city.availableModels,
    firstTrackedAt: new Date(city.firstTrackedAt),
    lastViewedAt: new Date(city.lastViewedAt),
    viewCount: city.viewCount,
    runsCollected: city.runsCollected,
})

const toRun = (row: RunRow): Run => ({
    id: row.id,
    issueTime: toIso(row.issueTime),
    origin: row.origin,
    cityId: row.cityId,
    startedAt: toIso(row.startedAt),
    finishedAt: row.finishedAt ? toIso(row.finishedAt) : null,
    status: row.status,
    rows: row.rows,
    citiesCount: row.citiesCount,
    warnings: (row.warnings ?? []) as string[],
    archivePath: row.archivePath,
})

const toMeta = (row: SnapshotRow): SnapshotMeta => ({
    cityId: row.cityId,
    issueTime: toIso(row.issueTime),
    runId: row.runId,
    origin: row.origin,
    fetchedAt: toIso(row.fetchedAt),
    metnoLastModified: row.metnoLastModified ?? undefined,
})

const findCities = async (db: Prisma.TransactionClient) => {
    const rows = await db.city.findMany({ orderBy: CITY_ORDER })

    return rows.map(toCity)
}

// Partition DDL runs once per week and process; parallel writes of one run share the pending call.
const ensurePartitionsOnce = (issueTime: Date) => {
    const week = getWeekStart(issueTime).getTime()
    const pending = ensuredWeeks.get(week) ?? ensureForecastPartitions(getPrisma(), issueTime)

    ensuredWeeks.set(week, pending)
    pending.catch(() => ensuredWeeks.delete(week))

    return pending
}

const toForecastRows = (snapshot: Snapshot, issueTime: Date): Prisma.ForecastCreateManyInput[] =>
    Object.entries(snapshot.models).flatMap(([modelId, series]) =>
        snapshot.steps.map((step, i) => {
            const validTime = new Date(step)
            const row: Prisma.ForecastCreateManyInput = {
                cityId: snapshot.cityId,
                modelId,
                issueTime,
                validTime,
                leadHours: Math.round((validTime.getTime() - issueTime.getTime()) / HOUR_MS),
            }

            for (const field of FIELDS) Object.assign(row, { [COLUMNS[field]]: series![field][i] ?? null })

            return row
        }),
    )

const findGridRows = (cityId: number, issueTime: Date, fields: SeriesField[], modelIds?: ModelId[]) => {
    const select = Object.fromEntries(fields.map((f) => [COLUMNS[f], true]))

    return getPrisma().forecast.findMany({
        where: { cityId, issueTime, ...(modelIds && { modelId: { in: modelIds } }) },
        select: { modelId: true, validTime: true, ...select },
    })
}

type GridRow = Awaited<ReturnType<typeof findGridRows>>[number]

const toGridModels = (rows: GridRow[], fields: SeriesField[], steps: string[]) => {
    const index = new Map(steps.map((s, i) => [new Date(s).getTime(), i]))
    const models: SeriesGrid['models'] = {}

    for (const row of rows) {
        const i = index.get(row.validTime.getTime())

        if (i === undefined) continue

        const series = (models[row.modelId as ModelId] ??= Object.fromEntries(
            fields.map((f) => [f, steps.map(() => null)]),
        ) as unknown as ModelSeries)

        for (const field of fields) series[field][i] = (row as unknown as Record<string, number | null>)[COLUMNS[field]]
    }

    return models
}

export const getCities = async () => findCities(getPrisma())

export const getCityBySlug = async (slug: string) => {
    const row = await getPrisma().city.findUnique({ where: { slug } })

    return row ? toCity(row) : undefined
}

// Read-modify-write over the whole city list, serialized by a transaction-scoped advisory lock so the collector and
// API instances never interleave (the list is capped at a few hundred rows). Only changed rows are written.
export const updateCities = (mutate: (cities: City[]) => City[]) =>
    getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('cities'))`

        const before = await findCities(tx)
        const byId = new Map(before.map((c) => [c.id, c]))
        const after = mutate(before)

        for (const city of after) {
            if (isEqual(byId.get(city.id), city)) continue

            const data = fromCity(city)

            await tx.city.upsert({ where: { id: city.id }, create: data, update: data })
        }

        return after
    })

export const getRuns = async () => {
    const rows = await getPrisma().collectionRun.findMany({ orderBy: { startedAt: 'desc' } })

    return rows.map(toRun)
}

export const getRun = async (id: string) => {
    const row = await getPrisma().collectionRun.findUnique({ where: { id } })

    return row ? toRun(row) : undefined
}

export const upsertRun = async (run: Run) => {
    const data = {
        ...run,
        issueTime: new Date(run.issueTime),
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
    }

    await getPrisma().collectionRun.upsert({ where: { id: run.id }, create: data, update: data })
}

// Replaces the city's rows for that issue time: a scheduled run overwrites an earlier preview of the same issue.
export const writeSnapshot = async (snapshot: Snapshot) => {
    const prisma = getPrisma()
    const issueTime = new Date(snapshot.issueTime)

    const rows = toForecastRows(snapshot, issueTime)
    const meta = {
        runId: snapshot.runId,
        origin: snapshot.origin,
        fetchedAt: new Date(snapshot.fetchedAt),
        metnoLastModified: snapshot.metnoLastModified ?? null,
    }

    await ensurePartitionsOnce(issueTime)
    await prisma.$transaction([
        prisma.forecast.deleteMany({ where: { cityId: snapshot.cityId, issueTime } }),
        prisma.forecast.createMany({ data: rows }),
        prisma.snapshot.upsert({
            where: { cityId_issueTime: { cityId: snapshot.cityId, issueTime } },
            create: { cityId: snapshot.cityId, issueTime, ...meta },
            update: meta,
        }),
    ])
}

export const getLatestSnapshotMeta = async (cityId: number) => {
    const row = await getPrisma().snapshot.findFirst({ where: { cityId }, orderBy: { issueTime: 'desc' } })

    return row ? toMeta(row) : null
}

// The stored grid of one snapshot, limited to `fields` and `modelIds` when given. Models without rows are absent.
export const getSnapshotGrid = async (
    meta: SnapshotMeta,
    fields: SeriesField[] = FIELDS,
    modelIds?: ModelId[],
): Promise<SeriesGrid> => {
    const issueTime = new Date(meta.issueTime)
    const steps = getWindowSteps(issueTime)

    const rows = await findGridRows(meta.cityId, issueTime, fields, modelIds)
    const models = toGridModels(rows, fields, steps)

    return { steps, models }
}

export const getLatestSnapshot = async (cityId: number, modelIds?: ModelId[]): Promise<Snapshot | null> => {
    const meta = await getLatestSnapshotMeta(cityId)

    if (!meta) return null

    const grid = await getSnapshotGrid(meta, undefined, modelIds)

    return { ...meta, ...grid }
}

export const deleteSnapshotsBefore = (cutoff: Date) =>
    getPrisma().snapshot.deleteMany({ where: { issueTime: { lt: cutoff } } })
