import { getAgeHours } from './time'

describe('getAgeHours', () => {
    const fetchedAt = '2026-10-02T09:00:00Z'

    it('rounds down, so data stays under 3 hours old until 3 full hours have passed', () => {
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T11:59:59Z'))).toBe(2)
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T12:00:00Z'))).toBe(3)
        expect(getAgeHours(fetchedAt, new Date('2026-10-03T03:59:00Z'))).toBe(18)
    })
})
