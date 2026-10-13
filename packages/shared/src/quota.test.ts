import { getQuotaStatus, isQuotaCurrent, LOW_QUOTA_SHARE } from './quota'

const RESETS_AT = '2026-10-14T00:00:00Z'

describe('getQuotaStatus', () => {
    it('counts the requests left and their share of the limit', () => {
        expect(getQuotaStatus({ limit: 50, used: 10, resetsAt: RESETS_AT })).toEqual({
            left: 40,
            share: 0.8,
            isLow: false,
        })
    })

    it('is low from a fifth of the limit down', () => {
        expect(getQuotaStatus({ limit: 50, used: 50 - 50 * LOW_QUOTA_SHARE, resetsAt: RESETS_AT }).isLow).toBe(true)
        expect(getQuotaStatus({ limit: 50, used: 39, resetsAt: RESETS_AT }).isLow).toBe(false)
    })

    it('never counts below zero when the server allowed more than the limit', () => {
        expect(getQuotaStatus({ limit: 50, used: 52, resetsAt: RESETS_AT })).toEqual({ left: 0, share: 0, isLow: true })
    })
})

describe('isQuotaCurrent', () => {
    it('keeps a count until its reset time', () => {
        const quota = { limit: 50, used: 3, resetsAt: RESETS_AT }

        expect(isQuotaCurrent(quota, new Date('2026-10-13T23:59:59Z'))).toBe(true)
        expect(isQuotaCurrent(quota, new Date(RESETS_AT))).toBe(false)
    })
})
