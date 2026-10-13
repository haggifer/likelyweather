import { QuotaResponse, QuotaResponseSchema } from '@fa/shared/api'
import { isQuotaCurrent } from '@fa/shared/quota'

const STORAGE_KEY = 'fa.quota'
const QUOTA_EVENT = 'quotachange'

let current: QuotaResponse | null | undefined

const readQuota = (): QuotaResponse | null => {
    try {
        const parsed = QuotaResponseSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))

        return parsed.success && isQuotaCurrent(parsed.data, new Date()) ? parsed.data : null
    } catch {
        return null
    }
}

// The last answer the server gave, so the meter shows on the first client render instead of after the request.
export const getQuotaSnapshot = (): QuotaResponse | null => (current ??= readQuota())

// The server can't read the viewer's storage: the first render shows nothing, as before the first fetch.
export const getServerQuotaSnapshot = (): QuotaResponse | null => null

export const subscribeQuota = (onChange: () => void) => {
    window.addEventListener(QUOTA_EVENT, onChange)

    return () => window.removeEventListener(QUOTA_EVENT, onChange)
}

export const storeQuota = (quota: QuotaResponse) => {
    current = quota

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quota))
    } catch {
        // storage can be blocked; the meter still updates for this page
    }

    window.dispatchEvent(new Event(QUOTA_EVENT))
}
