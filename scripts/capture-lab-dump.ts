// Captures a static dump of real API payloads for the Theme Lab gallery, which never fetches data itself.
// Re-run whenever the API shapes change or fresher shapes are wanted: pnpm lab:dump [--city kyiv-ua-703448]
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

const DUMP_PATH = path.resolve('src/fixtures/lab-dump.json')

try {
    process.loadEnvFile('.env.local')
} catch {
    console.warn('No .env.local found; using defaults')
}

const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { city: { type: 'string', default: 'kyiv-ua-703448' } },
})

const main = async () => {
    const { fetchModels, getWindowGrids } = await import('@/server/collector')
    const { toLatestResponse } = await import('@/server/latest')
    const { getCityBySlug } = await import('@/server/store')
    const { MODELS } = await import('@/shared/models')
    const { floorToStep, toIsoMinute } = await import('@/shared/time')
    const { VARIABLES } = await import('@/shared/variables')

    const city = await getCityBySlug(values.city!)

    if (!city) throw new Error(`Unknown city "${values.city}": track it first or pick a seed slug`)

    const now = new Date()
    const issueTime = toIsoMinute(floorToStep(now))
    const grids = getWindowGrids(new Date(issueTime))
    console.log(`Fetching forecasts for ${city.name}…`)
    const { models, hourly, warnings } = await fetchModels([city], grids, { log: (m) => console.log(m) })
    warnings.forEach((w) => console.warn(`WARN ${w}`))
    const snapshot = {
        cityId: city.id,
        issueTime,
        runId: 'lab-dump',
        origin: 'SCHEDULED' as const,
        fetchedAt: now.toISOString(),
        steps: grids.steps,
        models: models.get(city.id)!,
        hourly: { steps: grids.hourlySteps, models: hourly.get(city.id)! },
    }
    const toLatest = (resolution: 'step' | 'hourly') =>
        Object.fromEntries(VARIABLES.map((v) => [v.id, toLatestResponse(snapshot, v.id, resolution)]))

    const dump = {
        capturedAt: now.toISOString(),
        city: { ...city, availableModels: MODELS.map((m) => m.id).filter((id) => snapshot.models[id]) },
        latest: toLatest('step'),
        hourly: toLatest('hourly'),
    }

    writeFileSync(DUMP_PATH, `${JSON.stringify(dump)}\n`)
    console.log(`Wrote ${DUMP_PATH}`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
