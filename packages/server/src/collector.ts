import { City, Run, RunOrigin, RunStatus } from '@fa/shared/api'
import { MODEL_BY_ID, ModelId, MODELS, OPEN_METEO_MODELS } from '@fa/shared/models'
import { compactIso, floorToStep, toIsoMinute } from '@fa/shared/time'
import { ModelSeries } from '@fa/shared/variables'
import { chunk, delay } from 'es-toolkit'
import { writeRunArchive } from './archive'
import { getErrorMessage } from './errors'
import { fetchMetno, parseMetno } from './sources/metno'
import { fetchOpenMeteoForecast, OPEN_METEO_BATCH_SIZE, parseOpenMeteoModels } from './sources/open-meteo'
import { getLatestSnapshot, SeriesGrid, Snapshot, SnapshotMeta, updateCities, upsertRun, writeSnapshot } from './store'
import { getWindowSteps } from './window'

type Archive = (name: string, body: unknown) => Promise<unknown>

type Log = (message: string) => void

export interface CollectOptions {
    origin: RunOrigin
    cities: City[]
    now?: Date
    log?: Log
}

export interface CollectResult {
    run: Run
    snapshots: Snapshot[]
}

interface FetchModelsOptions {
    previous?: Map<number, Snapshot | null>
    archive?: Archive
    log?: Log
}

type ModelsByCity = Map<number, Partial<Record<ModelId, ModelSeries>>>

interface FetchModelsResult {
    models: ModelsByCity
    metnoLastModified: Map<number, string>
    warnings: string[]
}

type SnapshotStamp = Omit<SnapshotMeta, 'cityId' | 'metnoLastModified'> & Pick<SeriesGrid, 'steps'>

const METNO_PACE_MS = 200
const ERROR_MESSAGE_LENGTH = 160

const getShortErrorMessage = (error: unknown) => getErrorMessage(error).slice(0, ERROR_MESSAGE_LENGTH)

const realignSeries = (series: ModelSeries, fromSteps: string[], toSteps: string[]): ModelSeries => {
    const index = new Map(fromSteps.map((s, i) => [s, i]))
    const pick = (values: (number | null)[]) => toSteps.map((s) => values[index.get(s) ?? -1] ?? null)

    return Object.fromEntries(
        Object.entries(series).map(([field, values]) => [field, pick(values)]),
    ) as unknown as ModelSeries
}

const countSnapshotRows = (snapshot: Pick<Snapshot, 'models'>) =>
    Object.values(snapshot.models).reduce((sum, series) => sum + series.temp.filter((v) => v !== null).length, 0)

const realignMetno = (grid: SeriesGrid | null | undefined, toSteps: string[]) =>
    grid?.models.metno ? realignSeries(grid.models.metno, grid.steps, toSteps) : undefined

// The last snapshot of every city with only its met.no series, which is all a conditional met.no request can reuse.
const getPreviousMetno = async (cities: City[]) => {
    const entries = await Promise.all(
        cities.map(async (city) => {
            const snapshot = await getLatestSnapshot(city.id, [ModelId.Metno])

            return [city.id, snapshot] as const
        }),
    )

    return new Map(entries)
}

// A scheduled run that repeats an issue time already collected on schedule does not count as a new run.
const getRecollectedCityIds = (cities: City[], previous: Map<number, Snapshot | null>, issueTime: string) =>
    new Set(
        cities
            .filter((c) => previous.get(c.id)?.origin === 'SCHEDULED' && previous.get(c.id)?.issueTime === issueTime)
            .map((c) => c.id),
    )

const getMissingModelWarnings = (parsed: Partial<Record<ModelId, ModelSeries>>, city: City) =>
    OPEN_METEO_MODELS.filter((model) => !parsed[model] && !MODEL_BY_ID[model].isRegional).map(
        (model) => `${model} returned no data for ${city.name}`,
    )

const fetchOpenMeteoModels = async (cities: City[], steps: string[], archive: Archive, log: Log) => {
    const batches = chunk(cities, OPEN_METEO_BATCH_SIZE)
    const models: ModelsByCity = new Map(cities.map((c) => [c.id, {}]))
    const warnings: string[] = []

    for (const [i, batch] of batches.entries()) {
        try {
            log(`Open-Meteo batch ${i + 1}/${batches.length}: ${batch.length} cities`)
            const results = await fetchOpenMeteoForecast(batch)
            await archive(`open-meteo-${i + 1}`, results)

            batch.forEach((city, j) => {
                const parsed = parseOpenMeteoModels(results[j], steps)

                Object.assign(models.get(city.id)!, parsed)
                warnings.push(...getMissingModelWarnings(parsed, city))
            })
        } catch (error) {
            warnings.push(`Open-Meteo batch ${i + 1} failed: ${getShortErrorMessage(error)}`)
        }
    }

    return { models, warnings }
}

const fetchMetnoModels = async (
    cities: City[],
    steps: string[],
    previous: Map<number, Snapshot | null>,
    archive: Archive,
) => {
    const series = new Map<number, ModelSeries>()
    const lastModified = new Map<number, string>()
    const warnings: string[] = []

    for (const [i, city] of cities.entries()) {
        if (i > 0) await delay(METNO_PACE_MS)

        const last = previous.get(city.id)
        const lastMetno = realignMetno(last, steps)

        try {
            const res = await fetchMetno(city.lat, city.lon, lastMetno ? last?.metnoLastModified : undefined)

            if (res.lastModified) lastModified.set(city.id, res.lastModified)

            if (res.status === 304 && lastMetno) {
                series.set(city.id, lastMetno)
                continue
            }

            if (!res.body) continue

            await archive(`metno-${city.id}`, res.body)
            const parsed = parseMetno(res.body, steps)

            if (parsed) series.set(city.id, parsed)
            else warnings.push(`met.no returned no usable steps for ${city.name}`)
        } catch (error) {
            warnings.push(`met.no failed for ${city.name}: ${getShortErrorMessage(error)}`)
        }
    }

    return { series, lastModified, warnings }
}

const addMetno = (models: ModelsByCity, metno: Map<number, ModelSeries>) => {
    for (const [cityId, series] of metno) models.get(cityId)!.metno = series

    return models
}

// Fetches and parses every source for the given cities onto the hourly grid, without touching the store. Partial
// failures never throw: they become warnings.
const fetchModels = async (
    cities: City[],
    steps: string[],
    { previous = new Map(), archive = async () => {}, log = () => {} }: FetchModelsOptions = {},
): Promise<FetchModelsResult> => {
    const openMeteo = await fetchOpenMeteoModels(cities, steps, archive, log)
    const metno = await fetchMetnoModels(cities, steps, previous, archive)

    const models = addMetno(openMeteo.models, metno.series)

    return { models, metnoLastModified: metno.lastModified, warnings: [...openMeteo.warnings, ...metno.warnings] }
}

const toSnapshots = (cities: City[], fetched: FetchModelsResult, stamp: SnapshotStamp): Snapshot[] =>
    cities
        .map((city) => ({
            cityId: city.id,
            issueTime: stamp.issueTime,
            runId: stamp.runId,
            origin: stamp.origin,
            fetchedAt: stamp.fetchedAt,
            steps: stamp.steps,
            models: fetched.models.get(city.id)!,
            metnoLastModified: fetched.metnoLastModified.get(city.id),
        }))
        .filter((s) => Object.keys(s.models).length > 0)

const checkRunStatus = (rows: number, warnings: string[]): RunStatus => {
    if (rows === 0) return 'FAILED'

    return warnings.length ? 'PARTIAL' : 'OK'
}

const getAvailableModels = (snapshots: Snapshot[]) =>
    new Map(snapshots.map((s) => [s.cityId, MODELS.map((m) => m.id).filter((id) => s.models[id])]))

const applyAvailableModels = (
    cities: City[],
    available: Map<number, ModelId[]>,
    isCountedRun: (cityId: number) => boolean,
) =>
    cities.map((city) => {
        const availableModels = available.get(city.id)

        if (!availableModels) return city

        return { ...city, availableModels, runsCollected: city.runsCollected + (isCountedRun(city.id) ? 1 : 0) }
    })

export const getRunId = (origin: RunOrigin, issueTime: string, cityId?: number) =>
    origin === 'PREVIEW'
        ? `preview-${cityId}-${compactIso(issueTime)}`
        : `${origin.toLowerCase()}-${compactIso(issueTime)}`

export const countRows = (snapshots: Pick<Snapshot, 'models'>[]) =>
    snapshots.reduce((sum, s) => sum + countSnapshotRows(s), 0)

// One code path for scheduled runs, CLI runs, and on-demand previews (DECISIONS P7). FAILED only means no rows.
export const collect = async ({
    origin,
    cities,
    now = new Date(),
    log = () => {},
}: CollectOptions): Promise<CollectResult> => {
    const issueTime = toIsoMinute(floorToStep(now))
    const runId = getRunId(origin, issueTime, origin === 'PREVIEW' ? cities[0]?.id : undefined)
    const startedAt = new Date().toISOString()
    const steps = getWindowSteps(new Date(issueTime))
    const files: Record<string, unknown> = {}

    const previous = await getPreviousMetno(cities)
    const recollected = getRecollectedCityIds(cities, previous, issueTime)
    const fetched = await fetchModels(cities, steps, {
        previous,
        archive: async (name, body) => {
            files[name] = body
        },
        log,
    })
    const { warnings } = fetched
    const fetchedAt = new Date().toISOString()

    const snapshots = toSnapshots(cities, fetched, { issueTime, runId, origin, fetchedAt, steps })
    const run: Run = {
        id: runId,
        issueTime,
        origin,
        cityId: origin === 'PREVIEW' ? (cities[0]?.id ?? null) : null,
        startedAt,
        finishedAt: null,
        status: 'FAILED',
        rows: 0,
        citiesCount: 0,
        warnings,
        archivePath: null,
    }
    const rows = countRows(snapshots)
    const status = checkRunStatus(rows, warnings)
    const available = getAvailableModels(snapshots)
    const isCountedRun = (cityId: number) => origin === 'SCHEDULED' && !recollected.has(cityId)

    // Snapshots reference their run, so the run is stored first; it stays FAILED if the process dies mid-write.
    await upsertRun(run)
    await Promise.all(snapshots.map(writeSnapshot))
    await updateCities((all) => applyAvailableModels(all, available, isCountedRun))

    Object.assign(run, { finishedAt: fetchedAt, status, rows, citiesCount: snapshots.length })

    const archivePath = await writeRunArchive({ run, files }).catch((error) => {
        run.warnings.push(`Raw archive not written: ${getShortErrorMessage(error)}`)

        return null
    })

    run.archivePath = archivePath
    await upsertRun(run)
    log(`Run ${runId}: ${status}, ${rows} rows, ${snapshots.length} cities, ${warnings.length} warnings`)

    return { run, snapshots }
}
