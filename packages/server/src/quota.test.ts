import { DAILY_GLOBAL_QUOTA, DAILY_QUOTA, getQuota, trySpendQuota } from './quota'

const NOON = new Date('2030-01-01T12:00:00Z')

describe('daily quota', async () => {
    it('counts requests per client and refuses once the daily limit is used', async () => {
        for (let i = 0; i < DAILY_QUOTA; i++) expect(await trySpendQuota('client-a', NOON)).toBe(true)

        expect(await trySpendQuota('client-a', NOON)).toBe(false)
        expect(await getQuota('client-a', NOON)).toEqual({
            limit: DAILY_QUOTA,
            used: DAILY_QUOTA,
            resetsAt: '2030-01-02T00:00:00.000Z',
        })
        expect(await trySpendQuota('client-b', NOON)).toBe(true)
    })

    it('starts again on the next UTC day', async () => {
        const nextDay = new Date('2030-01-02T00:30:00Z')

        expect((await getQuota('client-a', nextDay)).used).toBe(0)
        expect(await trySpendQuota('client-a', nextDay)).toBe(true)
    })

    it('refuses every client once the app-wide daily cap is used', async () => {
        const day = new Date('2030-02-01T12:00:00Z')

        for (let i = 0; i < DAILY_GLOBAL_QUOTA; i++) await trySpendQuota(`user-${Math.floor(i / DAILY_QUOTA)}`, day)

        expect(await trySpendQuota('newcomer', day)).toBe(false)
        expect((await getQuota('newcomer', day)).used).toBe(0)
    })
})
