import { getRefreshDueAt } from '@fa/server/cities'
import { StoredSnapshotMeta } from '@fa/server/store'

export const PUBLIC_MAX_AGE_SECONDS = 300

// A stored run may be shared by CloudFront and browsers only until the server would fetch it again (3 hours, or the
// retry of a partial run): a copy cached past that moment would answer the next viewer, and their Refresh, without
// the fetch. A due run (served because this caller could not refresh it) is not shared at all.
export const getLatestMaxAge = (meta: StoredSnapshotMeta, now: Date) => {
    const secondsLeft = Math.floor((getRefreshDueAt(meta).getTime() - now.getTime()) / 1000)

    if (secondsLeft <= 0) return null

    return Math.min(PUBLIC_MAX_AGE_SECONDS, secondsLeft)
}
