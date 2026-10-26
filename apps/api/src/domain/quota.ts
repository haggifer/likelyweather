import { QuotaResponse } from '@fa/shared/api'
import { DAY_MS } from '@fa/shared/constants'
import { getCounter, incrementWithinLimits } from './cache'
import { HttpError } from './errors'

// The app-wide cap keeps the total within Open-Meteo's free tier for about ten active users even if each model counts
// as its own variables. A unit is an upstream request (Open-Meteo, met.no, geocoding) made on a client's behalf: a city
// refresh once the stored forecast is 3 hours old, an archive period not fully stored yet, or a geocoding search the
// cache cannot answer; reading stored data is free.
export const DAILY_QUOTA = 60
export const DAILY_GLOBAL_QUOTA = 600

const GLOBAL_CLIENT = 'all'

export const getDayStart = (now: Date) => Math.floor(now.getTime() / DAY_MS) * DAY_MS

export const getNextDayStart = (now: Date) => new Date(getDayStart(now) + DAY_MS)

const getKey = (client: string, now: Date) => `quota:${client}:${getDayStart(now)}`

export const getQuota = async (client: string, now = new Date()): Promise<QuotaResponse> => {
    const used = await getCounter(getKey(client, now))

    return {
        limit: DAILY_QUOTA,
        used: Math.min(DAILY_QUOTA, used),
        resetsAt: getNextDayStart(now).toISOString(),
    }
}

// The check and both increments are one atomic step in Redis.
export const trySpendQuota = (client: string, now = new Date()) =>
    incrementWithinLimits(
        [getKey(client, now), getKey(GLOBAL_CLIENT, now)],
        [DAILY_QUOTA, DAILY_GLOBAL_QUOTA],
        getNextDayStart(now),
    )

export const quotaExceeded = () =>
    new HttpError(
        429,
        'quota_exceeded',
        'The daily limit of new forecast requests is reached. Stored forecasts stay available; it resets at 00:00 UTC.',
    )
