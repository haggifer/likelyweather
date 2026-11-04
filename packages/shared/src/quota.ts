import { QuotaResponse } from './api'

export interface QuotaStatus {
    left: number
    share: number
    isLow: boolean
}

// The meter turns to the warning colour once a fifth of the day's requests or fewer are left.
export const LOW_QUOTA_SHARE = 0.2

export const getQuotaStatus = (quota: QuotaResponse): QuotaStatus => {
    const left = Math.max(0, quota.limit - quota.used)
    const share = left / quota.limit

    return { left, share, isLow: share <= LOW_QUOTA_SHARE }
}

// The stored answer is checked by hand rather than with `QuotaResponseSchema`, so the browser doesn't load zod for it.
export const isQuotaResponse = (value: unknown): value is QuotaResponse => {
    const quota = value as Partial<QuotaResponse> | null

    return typeof quota?.limit === 'number' && typeof quota.used === 'number' && typeof quota.resetsAt === 'string'
}

// A count whose reset time has passed is yesterday's; the first request of the day starts from the server's answer.
export const isQuotaCurrent = (quota: QuotaResponse, now: Date) => new Date(quota.resetsAt) > now
