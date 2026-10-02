import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { getAgeHours } from '@fa/shared/time'

export const isRefreshDue = (fetchedAt: string | undefined, now: Date | null) =>
    fetchedAt && now ? getAgeHours(fetchedAt, now) >= REFRESH_AFTER_HOURS : false
