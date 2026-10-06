import { QuotaResponse } from '@fa/shared/api'

const TOMORROW = new Date(Date.now() + 86_400_000).toISOString()
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString()

const stubBrowser = (stored: Record<string, string>) => {
    const listeners: (() => void)[] = []

    vi.stubGlobal('localStorage', {
        getItem: (key: string) => stored[key] ?? null,
        setItem: (key: string, value: string) => {
            stored[key] = value
        },
    })
    vi.stubGlobal('window', {
        addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
        removeEventListener: () => {},
        dispatchEvent: () => listeners.forEach((listener) => listener()),
    })
    vi.stubGlobal('Event', class {})
}

// The module caches its snapshot, so each case loads it afresh.
const loadStore = async () => {
    vi.resetModules()

    return import('./quota-store')
}

describe('quota store', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('reads the stored quota back while its reset time is ahead', async () => {
        const quota: QuotaResponse = { limit: 60, used: 3, resetsAt: TOMORROW }

        stubBrowser({ 'fa.quota': JSON.stringify(quota) })
        const { getQuotaSnapshot } = await loadStore()

        expect(getQuotaSnapshot()).toEqual(quota)
    })

    it('ignores a stored quota whose reset time has passed, and anything malformed', async () => {
        stubBrowser({ 'fa.quota': JSON.stringify({ limit: 60, used: 59, resetsAt: YESTERDAY }) })
        const expired = await loadStore()

        expect(expired.getQuotaSnapshot()).toBeNull()

        stubBrowser({ 'fa.quota': '{"limit":"sixty"}' })
        const malformed = await loadStore()

        expect(malformed.getQuotaSnapshot()).toBeNull()
    })

    it('stores a new answer and tells its subscribers', async () => {
        const stored: Record<string, string> = {}
        const quota: QuotaResponse = { limit: 60, used: 4, resetsAt: TOMORROW }
        const onChange = vi.fn()

        stubBrowser(stored)
        const { getQuotaSnapshot, storeQuota, subscribeQuota } = await loadStore()
        subscribeQuota(onChange)
        storeQuota(quota)

        expect(JSON.parse(stored['fa.quota'])).toEqual(quota)
        expect(getQuotaSnapshot()).toEqual(quota)
        expect(onChange).toHaveBeenCalledTimes(1)
    })
})
