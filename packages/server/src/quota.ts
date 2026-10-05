import { QuotaResponse } from '@fa/shared/api'
import { DAY_MS } from '@fa/shared/constants'
import { getCounter, incrementWithinLimits } from './cache'
import { HttpError } from './errors'

// Daily budget of upstream requests (Open-Meteo, met.no, geocoding) made on a client's behalf: a city refresh once the
// stored forecast is 3 hours old, adding a city not stored yet, or a geocoding search the cache cannot answer. Reading stored data is free. The app-wide cap keeps the
// total within Open-Meteo's free tier for about ten active users even if each model counts as its own variables.
export const DAILY_QUOTA = 60
export const DAILY_GLOBAL_QUOTA = 600

const GLOBAL_CLIENT = 'all'

const getDayStart = (now: Date) => Math.floor(now.getTime() / DAY_MS) * DAY_MS

const getNextDayStart = (now: Date) => new Date(getDayStart(now) + DAY_MS)

const getKey = (client: string, now: Date) => `quota:${client}:${getDayStart(now)}`

export const getQuota = async (client: string, now = new Date()): Promise<QuotaResponse> => {
    const used = await getCounter(getKey(client, now))

    return {
        limit: DAILY_QUOTA,
        used: Math.min(DAILY_QUOTA, used),
        resetsAt: getNextDayStart(now).toISOString(),
    }
}

// Counts one upstream request, or returns false without counting when the client or the app has none left. The
// check and both increments are one atomic step in Redis.
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
