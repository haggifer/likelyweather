import { getPrisma } from '@fa/db/client'
import { dropExpiredForecastPartitions } from '@fa/db/partitions'
import { City, CityStatus } from '@fa/shared/api'
import { DAY_MS } from '@fa/shared/constants'
import { acquireLock } from './cache'
import { applyDormancy } from './cities'
import { collect, CollectResult } from './collector'
import { env } from './env'
import { deleteSnapshotsBefore, getCities } from './store'

export interface ScheduledRunOptions {
    slugs?: string[]
    now?: Date
    log?: (message: string) => void
}

const LOCK_TTL_SECONDS = 600
const selectCities = (cities: City[], slugs?: string[]) =>
    slugs ? cities.filter((c) => slugs.includes(c.slug)) : cities.filter((c) => c.status === CityStatus.Active)

const getUnknownSlugs = (slugs: string[], cities: City[]) => {
    const known = new Set(cities.map((c) => c.slug))

    return slugs.filter((s) => !known.has(s))
}

// The scheduled run shared by the Lambda handler and the CLI: one holder of the collector lock at a time, dormancy
// and queue promotion first, then every active city (or the given slugs), then retention.
export const runScheduled = async ({
    slugs,
    now = new Date(),
    log = () => {},
}: ScheduledRunOptions = {}): Promise<CollectResult | null> => {
    const release = await acquireLock('collector', LOCK_TTL_SECONDS)

    if (!release) {
        log('Collector lock is held by another run; exiting')
        return null
    }

    try {
        await applyDormancy(now)

        const all = await getCities()
        const cities = selectCities(all, slugs)

        if (slugs && cities.length !== slugs.length) {
            log(`Unknown slugs skipped: ${getUnknownSlugs(slugs, cities).join(', ')}`)
        }

        if (!cities.length) {
            log('No cities to collect')
            return null
        }

        const result = await collect({ origin: 'SCHEDULED', cities, now, log })
        const dropped = await dropExpiredForecastPartitions(getPrisma(), now, env.RETENTION_DAYS)
        await deleteSnapshotsBefore(new Date(now.getTime() - env.RETENTION_DAYS * DAY_MS))

        if (dropped.length) log(`Dropped partitions: ${dropped.join(', ')}`)

        return result
    } finally {
        await release()
    }
}
