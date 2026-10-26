import { City } from '@fa/shared/api'
import { MODEL_BY_ID, ModelId, OPEN_METEO_MODELS } from '@fa/shared/models'
import { compactIso, floorToStep, toIsoMinute } from '@fa/shared/time'
import { ModelSeries } from '@fa/shared/variables'
import { getErrorMessage } from './errors'
import { fetchMetno, parseMetno } from './sources/metno'
import { fetchOpenMeteoForecast, parseOpenMeteoModels } from './sources/open-meteo'
import {
    getLatestSnapshot,
    recordRunWithoutSnapshot,
    Run,
    RunStatus,
    SeriesGrid,
    Snapshot,
    upsertRun,
    writeSnapshot,
} from './store'
import { getWindowSteps } from './window'

export interface CollectOptions {
    city: City
    now?: Date
}

export interface CollectResult {
    run: Run
    snapshot: Snapshot | null
}

type Models = SeriesGrid['models']

interface OpenMeteoModels {
    models: Models
    warnings: string[]
}

interface MetnoModel {
    series?: ModelSeries
    lastModified?: string
    warnings: string[]
}

const ERROR_MESSAGE_LENGTH = 160

const getShortErrorMessage = (error: unknown) => getErrorMessage(error).slice(0, ERROR_MESSAGE_LENGTH)

const realignSeries = (series: ModelSeries, fromSteps: string[], toSteps: string[]): ModelSeries => {
    const index = new Map(fromSteps.map((s, i) => [s, i]))
    const pick = (values: (number | null)[]) => toSteps.map((s) => values[index.get(s) ?? -1] ?? null)

    return Object.fromEntries(
        Object.entries(series).map(([field, values]) => [field, pick(values)]),
    ) as unknown as ModelSeries
}

const realignMetno = (grid: SeriesGrid | null, toSteps: string[]) =>
    grid?.models.metno ? realignSeries(grid.models.metno, grid.steps, toSteps) : undefined

const getMissingModelWarnings = (parsed: Models, city: City) =>
    OPEN_METEO_MODELS.filter((model) => !parsed[model] && !MODEL_BY_ID[model].isRegional).map(
        (model) => `${model} returned no data for ${city.name}`,
    )

const fetchOpenMeteoModels = async (city: City, steps: string[]): Promise<OpenMeteoModels> => {
    try {
        const [location] = await fetchOpenMeteoForecast([city])
        const models = parseOpenMeteoModels(location, steps)

        return { models, warnings: getMissingModelWarnings(models, city) }
    } catch (error) {
        return { models: {}, warnings: [`Open-Meteo failed for ${city.name}: ${getShortErrorMessage(error)}`] }
    }
}

// `previous` is the city's last snapshot with only its met.no series, which is all a conditional request can reuse.
const fetchMetnoModel = async (city: City, steps: string[], previous: Snapshot | null): Promise<MetnoModel> => {
    const lastMetno = realignMetno(previous, steps)

    try {
        const res = await fetchMetno(city.lat, city.lon, lastMetno ? previous?.metnoLastModified : undefined)
        const lastModified = res.lastModified ?? undefined

        if (res.status === 304 && lastMetno) return { series: lastMetno, lastModified, warnings: [] }

        if (!res.body) return { lastModified, warnings: [] }

        const series = parseMetno(res.body, steps) ?? undefined
        const warnings = series ? [] : [`met.no returned no usable steps for ${city.name}`]

        return { series, lastModified, warnings }
    } catch (error) {
        return { warnings: [`met.no failed for ${city.name}: ${getShortErrorMessage(error)}`] }
    }
}

const getRunId = (cityId: number, issueTime: string) => `preview-${cityId}-${compactIso(issueTime)}`

// A new issue carrying met.no alone would replace the stored run of an earlier issue, which has every model; that run
// is served instead. A refetch in the same issue keeps the stored models it does not bring back (`writeSnapshot`).
const isNewIssueWithoutOpenMeteo = (openMeteo: Models, previous: Snapshot | null, issueTime: string) =>
    !Object.keys(openMeteo).length &&
    previous !== null &&
    new Date(previous.issueTime).getTime() !== new Date(issueTime).getTime()

const checkRunStatus = (rows: number, warnings: string[]): RunStatus => {
    if (rows === 0) return 'FAILED'

    return warnings.length ? 'PARTIAL' : 'OK'
}

export const countRows = (snapshot: Pick<Snapshot, 'models'>) =>
    Object.values(snapshot.models).reduce((sum, series) => sum + series.temp.filter((v) => v !== null).length, 0)

// Source failures never throw: they become warnings, and the run is FAILED only when no model returned data.
export const collect = async ({ city, now = new Date() }: CollectOptions): Promise<CollectResult> => {
    const issueTime = toIsoMinute(floorToStep(now))
    const runId = getRunId(city.id, issueTime)
    const startedAt = new Date().toISOString()
    const steps = getWindowSteps(new Date(issueTime))

    const previous = await getLatestSnapshot(city.id, [ModelId.Metno])
    const [openMeteo, metno] = await Promise.all([
        fetchOpenMeteoModels(city, steps),
        fetchMetnoModel(city, steps, previous),
    ])
    const fetchedAt = new Date().toISOString()

    const models: Models = metno.series ? { ...openMeteo.models, [ModelId.Metno]: metno.series } : openMeteo.models
    const warnings = [...openMeteo.warnings, ...metno.warnings]
    const isMetnoOnlyNewIssue = isNewIssueWithoutOpenMeteo(openMeteo.models, previous, issueTime)
    const snapshot: Snapshot | null =
        Object.keys(models).length && !isMetnoOnlyNewIssue
            ? { cityId: city.id, issueTime, runId, fetchedAt, steps, models, metnoLastModified: metno.lastModified }
            : null
    const rows = snapshot ? countRows(snapshot) : 0
    const run: Run = {
        id: runId,
        issueTime,
        cityId: city.id,
        startedAt,
        finishedAt: null,
        status: 'FAILED',
        rows: 0,
        citiesCount: 0,
        warnings,
    }

    // A snapshot references its run, so the run is stored first; it stays FAILED if the process dies mid-write.
    if (snapshot) {
        await upsertRun(run)
        await writeSnapshot(snapshot)
    }

    Object.assign(run, {
        finishedAt: fetchedAt,
        status: checkRunStatus(rows, warnings),
        rows,
        citiesCount: snapshot ? 1 : 0,
    })

    if (snapshot) await upsertRun(run)
    else await recordRunWithoutSnapshot(run)

    // The run rows are not shown anywhere, so the logs are where a failing source shows up.
    if (warnings.length) console.warn(`Run ${runId} ${run.status}: ${warnings.join('; ')}`)

    return { run, snapshot }
}
