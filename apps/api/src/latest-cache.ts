import { HOUR_MS, REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { isRefreshDue } from '@fa/shared/time'

export const PUBLIC_MAX_AGE_SECONDS = 300

// A stored run may be shared by CloudFront and browsers only until the moment the UI offers Refresh: a copy cached
// just before that moment would answer the Refresh with the same body. A due run (served because this caller could
// not refresh it) is not shared at all.
export const getLatestMaxAge = (fetchedAt: string, now: Date) => {
    if (isRefreshDue(fetchedAt, now)) return null

    const dueAt = new Date(fetchedAt).getTime() + REFRESH_AFTER_HOURS * HOUR_MS
    const secondsLeft = Math.floor((dueAt - now.getTime()) / 1000)

    return Math.max(0, Math.min(PUBLIC_MAX_AGE_SECONDS, secondsLeft))
}
