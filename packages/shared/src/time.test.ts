import { getAgeHours, getMsUntilRefreshDue, isRefreshDue } from './time'

describe('getAgeHours', () => {
    const fetchedAt = '2026-10-02T09:00:00Z'

    it('rounds down, so data stays under 3 hours old until 3 full hours have passed', () => {
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T11:59:59Z'))).toBe(2)
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T12:00:00Z'))).toBe(3)
        expect(getAgeHours(fetchedAt, new Date('2026-10-03T03:59:00Z'))).toBe(18)
    })
})

describe('isRefreshDue', () => {
    const fetchedAt = '2026-10-05T06:05:00.000Z'

    it('is due once the forecast is 3 full hours old', () => {
        expect(isRefreshDue(fetchedAt, new Date('2026-10-05T09:04:59Z'))).toBe(false)
        expect(isRefreshDue(fetchedAt, new Date('2026-10-05T09:05:00Z'))).toBe(true)
    })
})

describe('getMsUntilRefreshDue', () => {
    const fetchedAt = '2026-10-05T06:05:00.000Z'

    it('counts down to the moment isRefreshDue turns true, then stays at 0', () => {
        expect(getMsUntilRefreshDue(fetchedAt, new Date('2026-10-05T09:04:59Z'))).toBe(1000)
        expect(getMsUntilRefreshDue(fetchedAt, new Date('2026-10-05T09:05:00Z'))).toBe(0)
        expect(getMsUntilRefreshDue(fetchedAt, new Date('2026-10-05T12:00:00Z'))).toBe(0)
    })
})
