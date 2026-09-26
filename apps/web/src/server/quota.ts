import { cacheGet, cacheSet } from '@/server/cache'
import { HttpError } from '@/server/errors'
import { QuotaResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'

// Daily budget of upstream requests (Open-Meteo, met.no) made on a client's behalf: a city refresh when a newer run
// exists, or a geocoding search the cache cannot answer. Reading stored data is free. The app-wide cap keeps the
// total within Open-Meteo's free tier for about ten active users even if each model counts as its own variables.
export const DAILY_QUOTA = 60
export const DAILY_GLOBAL_QUOTA = 600

const DAY_MS = 24 * HOUR_MS
const GLOBAL_KEY = 'all'

const getDayStart = (now: Date) => Math.floor(now.getTime() / DAY_MS) * DAY_MS

const getKey = (client: string, now: Date) => `quota:${client}:${getDayStart(now)}`

const getUsed = (client: string, now: Date) => cacheGet<number>(getKey(client, now)) ?? 0

const add = (client: string, now: Date) => {
    const ttlSeconds = Math.ceil((getDayStart(now) + DAY_MS - now.getTime()) / 1000)
    cacheSet(getKey(client, now), getUsed(client, now) + 1, ttlSeconds)
}

export const getQuota = (client: string, now = new Date()): QuotaResponse => ({
    limit: DAILY_QUOTA,
    used: Math.min(DAILY_QUOTA, getUsed(client, now)),
    resetsAt: new Date(getDayStart(now) + DAY_MS).toISOString(),
})

// Counts one upstream request, or returns false without counting when the client or the app has none left.
export const trySpendQuota = (client: string, now = new Date()) => {
    if (getUsed(client, now) >= DAILY_QUOTA || getUsed(GLOBAL_KEY, now) >= DAILY_GLOBAL_QUOTA) return false

    add(client, now)
    add(GLOBAL_KEY, now)

    return true
}

export const quotaExceeded = () =>
    new HttpError(
        429,
        'quota_exceeded',
        'The daily limit of new forecast requests is reached. Stored forecasts stay available; it resets at 00:00 UTC.',
    )
