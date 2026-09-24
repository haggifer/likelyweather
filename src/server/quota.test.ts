import { DAILY_GLOBAL_QUOTA, DAILY_QUOTA, getQuota, trySpendQuota } from '@/server/quota'

const NOON = new Date('2030-01-01T12:00:00Z')

describe('daily quota', () => {
    it('counts requests per client and refuses once the daily limit is used', () => {
        for (let i = 0; i < DAILY_QUOTA; i++) expect(trySpendQuota('client-a', NOON)).toBe(true)

        expect(trySpendQuota('client-a', NOON)).toBe(false)
        expect(getQuota('client-a', NOON)).toEqual({
            limit: DAILY_QUOTA,
            used: DAILY_QUOTA,
            resetsAt: '2030-01-02T00:00:00.000Z',
        })
        expect(trySpendQuota('client-b', NOON)).toBe(true)
    })

    it('starts again on the next UTC day', () => {
        const nextDay = new Date('2030-01-02T00:30:00Z')

        expect(getQuota('client-a', nextDay).used).toBe(0)
        expect(trySpendQuota('client-a', nextDay)).toBe(true)
    })

    it('refuses every client once the app-wide daily cap is used', () => {
        const day = new Date('2030-02-01T12:00:00Z')

        for (let i = 0; i < DAILY_GLOBAL_QUOTA; i++) trySpendQuota(`user-${Math.floor(i / DAILY_QUOTA)}`, day)

        expect(trySpendQuota('newcomer', day)).toBe(false)
        expect(getQuota('newcomer', day).used).toBe(0)
    })
})
