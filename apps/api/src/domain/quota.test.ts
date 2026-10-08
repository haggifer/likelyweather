import { DAILY_GLOBAL_QUOTA, DAILY_QUOTA, getQuota, trySpendQuota } from './quota'

const NOON = new Date('2030-01-01T12:00:00Z')

describe('daily quota', async () => {
    it('counts requests per client and refuses once the daily limit is used', async () => {
        for (let i = 0; i < DAILY_QUOTA; i++) {
            const isSpent = await trySpendQuota('client-a', NOON)

            expect(isSpent).toBe(true)
        }

        const isOverLimitSpent = await trySpendQuota('client-a', NOON)
        const quota = await getQuota('client-a', NOON)
        const isOtherClientSpent = await trySpendQuota('client-b', NOON)

        expect(isOverLimitSpent).toBe(false)
        expect(quota).toEqual({ limit: DAILY_QUOTA, used: DAILY_QUOTA, resetsAt: '2030-01-02T00:00:00.000Z' })
        expect(isOtherClientSpent).toBe(true)
    })

    it('starts again on the next UTC day', async () => {
        const nextDay = new Date('2030-01-02T00:30:00Z')

        const quota = await getQuota('client-a', nextDay)
        const isSpent = await trySpendQuota('client-a', nextDay)

        expect(quota.used).toBe(0)
        expect(isSpent).toBe(true)
    })

    it('refuses every client once the app-wide daily cap is used', async () => {
        const day = new Date('2030-02-01T12:00:00Z')

        for (let i = 0; i < DAILY_GLOBAL_QUOTA; i++) await trySpendQuota(`user-${Math.floor(i / DAILY_QUOTA)}`, day)

        const isSpent = await trySpendQuota('newcomer', day)
        const quota = await getQuota('newcomer', day)

        expect(isSpent).toBe(false)
        expect(quota.used).toBe(0)
    })
})
