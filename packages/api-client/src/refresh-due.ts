import { isRefreshDue } from '@fa/shared/time'

// Before the data or the clock is known (first render), Refresh stays off.
export const isRefreshOffered = (fetchedAt: string | undefined, now: Date | null) =>
    fetchedAt && now ? isRefreshDue(fetchedAt, now) : false
