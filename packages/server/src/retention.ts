import { getPrisma } from '@fa/db/client'
import { dropExpiredForecastPartitions } from '@fa/db/partitions'
import { DAY_MS } from '@fa/shared/constants'
import { claim } from './cache'
import { env } from './env'
import { deleteRunsBefore, deleteSnapshotsBefore } from './store'

const CLAIM_SECONDS = DAY_MS / 1000

let prunedDay: string | undefined

// Forecasts are kept for RETENTION_DAYS. There is no scheduled job, so the first fetch of each UTC
// day prunes them: once per process, and once across processes through the shared claim. Pruning is idempotent, so
// a claim granted twice (Redis down) only repeats the work.
export const pruneExpiredForecasts = async (now = new Date()) => {
    const day = now.toISOString().slice(0, 10)

    if (prunedDay === day) return

    prunedDay = day
    const isClaimed = await claim(`retention:${day}`, CLAIM_SECONDS)

    if (!isClaimed) return

    const cutoff = new Date(now.getTime() - env.RETENTION_DAYS * DAY_MS)

    await dropExpiredForecastPartitions(getPrisma(), now, env.RETENTION_DAYS)
    await deleteSnapshotsBefore(cutoff)
    await deleteRunsBefore(cutoff)
}
