import { fetchMetno, parseMetno } from '@/server/sources/metno'
import { fetchOpenMeteoForecast, OPEN_METEO_BATCH_SIZE, parseOpenMeteoModels } from '@/server/sources/openMeteo'
import { getLatestSnapshot, Snapshot, updateCities, upsertRun, writeRaw, writeSnapshot } from '@/server/store'
import { City, Run, RunOrigin, RunStatus } from '@/shared/api'
import { FORECAST_HOURS, PAST_HOURS } from '@/shared/constants'
import { MODEL_BY_ID, ModelId, MODELS, OPEN_METEO_MODELS } from '@/shared/models'
import { addHours, buildSteps, compactIso, floorToStep, toIsoMinute } from '@/shared/time'
import { ModelSeries } from '@/shared/variables'
import { chunk } from 'es-toolkit'

export interface CollectOptions {
    origin: RunOrigin
    cities: City[]
    now?: Date
    log?: (message: string) => void
}

export interface CollectResult {
    run: Run
    snapshots: Snapshot[]
}

const METNO_PACE_MS = 200

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 160)

export const getRunId = (origin: RunOrigin, issueTime: string, cityId?: number) =>
    origin === 'PREVIEW'
        ? `preview-${cityId}-${compactIso(issueTime)}`
        : `${origin.toLowerCase()}-${compactIso(issueTime)}`

export const getWindowSteps = (issueTime: Date) =>
    buildSteps(addHours(issueTime, -PAST_HOURS), addHours(issueTime, FORECAST_HOURS))

const realignSeries = (series: ModelSeries, fromSteps: string[], toSteps: string[]): ModelSeries => {
    const index = new Map(fromSteps.map((s, i) => [s, i]))
    const pick = (values: (number | null)[]) => toSteps.map((s) => values[index.get(s) ?? -1] ?? null)

    return Object.fromEntries(
        Object.entries(series).map(([field, values]) => [field, pick(values)]),
    ) as unknown as ModelSeries
}

const countRows = (snapshot: Snapshot) =>
    Object.values(snapshot.models).reduce((sum, series) => sum + series.temp.filter((v) => v !== null).length, 0)

// One code path for scheduled runs, CLI runs, and on-demand previews (guide §2.5, §6). Partial failures never
// throw: they become warnings and a PARTIAL status, and FAILED only means no rows at all.
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
    const warnings: string[] = []
    const models = new Map<number, Partial<Record<ModelId, ModelSeries>>>(cities.map((c) => [c.id, {}]))
    const metnoLastModified = new Map<number, string>()
    const recollected = new Set<number>()

    const batches = chunk(cities, OPEN_METEO_BATCH_SIZE)

    for (const [i, batch] of batches.entries()) {
        try {
            log(`Open-Meteo batch ${i + 1}/${batches.length}: ${batch.length} cities`)
            const results = await fetchOpenMeteoForecast(batch)
            await writeRaw(runId, `open-meteo-${i + 1}`, results)

            batch.forEach((city, j) => {
                const parsed = parseOpenMeteoModels(results[j], steps)
                Object.assign(models.get(city.id)!, parsed)

                for (const model of OPEN_METEO_MODELS) {
                    if (!parsed[model] && !MODEL_BY_ID[model].regional) {
                        warnings.push(`${model} returned no data for ${city.name}`)
                    }
                }
            })
        } catch (error) {
            warnings.push(`Open-Meteo batch ${i + 1} failed: ${getErrorMessage(error)}`)
        }
    }

    for (const [i, city] of cities.entries()) {
        if (i > 0) await sleep(METNO_PACE_MS)

        const previous = await getLatestSnapshot(city.id)

        if (previous?.origin === 'SCHEDULED' && previous.issueTime === issueTime) recollected.add(city.id)

        try {
            const res = await fetchMetno(city.lat, city.lon, previous?.metnoLastModified)

            if (res.lastModified) metnoLastModified.set(city.id, res.lastModified)

            if (res.status === 304 && previous?.models.metno) {
                models.get(city.id)!.metno = realignSeries(previous.models.metno, previous.steps, steps)
                continue
            }

            if (!res.body) continue

            await writeRaw(runId, `metno-${city.id}`, res.body)
            const parsed = parseMetno(res.body, steps)

            if (parsed) models.get(city.id)!.metno = parsed
            else warnings.push(`met.no returned no usable steps for ${city.name}`)
        } catch (error) {
            warnings.push(`met.no failed for ${city.name}: ${getErrorMessage(error)}`)
        }
    }

    const fetchedAt = new Date().toISOString()
    const snapshots: Snapshot[] = cities
        .map((city) => ({
            cityId: city.id,
            issueTime,
            runId,
            origin,
            fetchedAt,
            steps,
            models: models.get(city.id)!,
            metnoLastModified: metnoLastModified.get(city.id),
        }))
        .filter((s) => Object.keys(s.models).length > 0)

    await Promise.all(snapshots.map(writeSnapshot))

    const rows = snapshots.reduce((sum, s) => sum + countRows(s), 0)
    const status: RunStatus = rows === 0 ? 'FAILED' : warnings.length ? 'PARTIAL' : 'OK'
    const available = new Map(snapshots.map((s) => [s.cityId, MODELS.map((m) => m.id).filter((id) => s.models[id])]))

    await updateCities((all) =>
        all.map((city) => {
            const availableModels = available.get(city.id)

            if (!availableModels) return city

            return {
                ...city,
                availableModels,
                runsCollected: city.runsCollected + (origin === 'SCHEDULED' && !recollected.has(city.id) ? 1 : 0),
            }
        }),
    )

    const run: Run = {
        id: runId,
        issueTime,
        origin,
        cityId: origin === 'PREVIEW' ? (cities[0]?.id ?? null) : null,
        startedAt,
        finishedAt: fetchedAt,
        status,
        rows,
        citiesCount: snapshots.length,
        warnings,
        archivePath: runId,
    }
    await upsertRun(run)
    log(`Run ${runId}: ${status}, ${rows} rows, ${snapshots.length} cities, ${warnings.length} warnings`)

    return { run, snapshots }
}
