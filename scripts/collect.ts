// Local entry for the scheduled collector. The Lambda handler would wrap the same `collect` call.
// Usage: pnpm collect [--cities kharkiv-ua-706483,kyiv-ua-703448] [--loop]
import { parseArgs } from 'node:util'

const LOCK_TTL_SECONDS = 600
const LOOP_DELAY_AFTER_GRID_MS = 5 * 60_000

try {
    process.loadEnvFile('.env.local')
} catch {
    console.warn('No .env.local found; using defaults')
}

const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { cities: { type: 'string' }, loop: { type: 'boolean', default: false } },
})

const runOnce = async () => {
    const { applyDormancy } = await import('@/server/cities')
    const { collect } = await import('@/server/collector')
    const { acquireJobLock, getCities } = await import('@/server/store')
    const { CityStatus } = await import('@/shared/api')

    const release = await acquireJobLock('collector', LOCK_TTL_SECONDS)

    if (!release) {
        console.log('Collector lock is held by another run; exiting')
        return
    }

    try {
        await applyDormancy()
        const requested = values.cities?.split(',').filter(Boolean)
        const all = await getCities()
        const cities = requested
            ? all.filter((c) => requested.includes(c.slug))
            : all.filter((c) => c.status === CityStatus.Active)

        if (requested && cities.length !== requested.length) {
            const known = new Set(cities.map((c) => c.slug))
            console.warn(`Unknown slugs skipped: ${requested.filter((s) => !known.has(s)).join(', ')}`)
        }

        if (!cities.length) {
            console.log('No cities to collect')
            return
        }

        const { run } = await collect({ origin: 'SCHEDULED', cities, log: (m) => console.log(m) })
        run.warnings.forEach((w) => console.warn(`WARN ${w}`))
    } finally {
        await release()
    }
}

const getNextRunDelay = () => {
    const stepMs = 6 * 3_600_000
    const next = Math.ceil(Date.now() / stepMs) * stepMs + LOOP_DELAY_AFTER_GRID_MS

    return next - Date.now()
}

const main = async () => {
    await runOnce()

    while (values.loop) {
        const delay = getNextRunDelay()
        console.log(`Next run in ${Math.round(delay / 60_000)} min`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        await runOnce()
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
