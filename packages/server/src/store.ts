// Postgres through Prisma.
import { getPrisma, Prisma } from '@fa/db/client'
import { ensureForecastPartitions, getWeekStart } from '@fa/db/partitions'
import { City } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { Coordinates } from '@fa/shared/geo'
import { ModelId } from '@fa/shared/models'
import { ModelSeries, SeriesField } from '@fa/shared/variables'
import { getWindowSteps } from './window'

export interface SeriesGrid {
    steps: string[]
    models: Partial<Record<ModelId, ModelSeries>>
}

export interface SnapshotMeta {
    cityId: number
    issueTime: string
    runId: string
    fetchedAt: string
    metnoLastModified?: string
}

// One run for one city on the hourly grid (`getWindowSteps`).
export interface Snapshot extends SnapshotMeta, SeriesGrid {}

export type RunStatus = 'OK' | 'PARTIAL' | 'FAILED'

// A stored snapshot with the status of the run that wrote it.
export interface StoredSnapshotMeta extends SnapshotMeta {
    runStatus: RunStatus
}

export interface Run {
    id: string
    issueTime: string
    cityId: number | null
    startedAt: string
    finishedAt: string | null
    status: RunStatus
    rows: number
    citiesCount: number
    warnings: string[]
}

type CityRow = Prisma.CityGetPayload<object>
type SnapshotRow = Prisma.SnapshotGetPayload<{ include: { run: { select: { status: true } } } }>

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
// Every run is fetched on demand now; the column still holds the origin of older scheduled and imported runs.
const ORIGIN = 'PREVIEW' as const

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
})

const toMeta = (row: SnapshotRow): StoredSnapshotMeta => ({
    cityId: row.cityId,
    issueTime: toIso(row.issueTime),
    runId: row.runId,
    fetchedAt: toIso(row.fetchedAt),
    metnoLastModified: row.metnoLastModified ?? undefined,
    runStatus: row.run.status,
})

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

export const countCities = () => getPrisma().city.count()

export const getCityById = async (id: number) => {
    const row = await getPrisma().city.findUnique({ where: { id } })

    return row ? toCity(row) : undefined
}

export const getCityBySlug = async (slug: string) => {
    const row = await getPrisma().city.findUnique({ where: { slug } })

    return row ? toCity(row) : undefined
}

// Ordered by the great-circle distance computed in SQL (haversine over lat and lon). A full scan: with hundreds of
// cities that is cheaper than an index; past tens of thousands, add `earthdistance` or PostGIS.
export const getNearestCity = async ({ lat, lon }: Coordinates) => {
    const rows = await getPrisma().$queryRaw<CityRow[]>`
        SELECT * FROM "City"
        ORDER BY asin(least(1.0, sqrt(
            power(sin(radians(lat - ${lat}) / 2), 2)
            + cos(radians(${lat})) * cos(radians(lat)) * power(sin(radians(lon - ${lon}) / 2), 2)
        )))
        LIMIT 1`

    return rows[0] ? toCity(rows[0]) : undefined
}

// Keeps the stored city when two requests add the same one.
export const addCity = async (city: City) => {
    const row = await getPrisma().city.upsert({ where: { id: city.id }, create: fromCity(city), update: {} })

    return toCity(row)
}

export const upsertRun = async (run: Run) => {
    const data = {
        ...run,
        origin: ORIGIN,
        issueTime: new Date(run.issueTime),
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
    }

    await getPrisma().collectionRun.upsert({ where: { id: run.id }, create: data, update: data })
}

// Replaces only the rows of the models the snapshot carries, so fetching one issue twice never duplicates them and a
// refetch that lost a source (a partial run) keeps that source's rows from the earlier, complete fetch.
export const writeSnapshot = async (snapshot: Snapshot) => {
    const prisma = getPrisma()
    const issueTime = new Date(snapshot.issueTime)
    const modelIds = Object.keys(snapshot.models)

    const rows = toForecastRows(snapshot, issueTime)
    const meta = {
        runId: snapshot.runId,
        origin: ORIGIN,
        fetchedAt: new Date(snapshot.fetchedAt),
        metnoLastModified: snapshot.metnoLastModified ?? null,
    }

    await ensurePartitionsOnce(issueTime)
    await prisma.$transaction([
        prisma.forecast.deleteMany({ where: { cityId: snapshot.cityId, issueTime, modelId: { in: modelIds } } }),
        // Another instance can write the same run between the delete and the insert; its rows are identical.
        prisma.forecast.createMany({ data: rows, skipDuplicates: true }),
        prisma.snapshot.upsert({
            where: { cityId_issueTime: { cityId: snapshot.cityId, issueTime } },
            create: { cityId: snapshot.cityId, issueTime, ...meta },
            update: meta,
        }),
    ])
}

export const getLatestSnapshotMeta = async (cityId: number) => {
    const row = await getPrisma().snapshot.findFirst({
        where: { cityId },
        orderBy: { issueTime: 'desc' },
        include: { run: { select: { status: true } } },
    })

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

// Runs older than the forecasts they produced; deleting a run also deletes its snapshots.
export const deleteRunsBefore = (cutoff: Date) =>
    getPrisma().collectionRun.deleteMany({ where: { issueTime: { lt: cutoff } } })
