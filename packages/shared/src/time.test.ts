import { getAgeHours, isCurrentIssue } from './time'

describe('getAgeHours', () => {
    const fetchedAt = '2026-10-02T09:00:00Z'

    it('rounds down, so data stays under 3 hours old until 3 full hours have passed', () => {
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T11:59:59Z'))).toBe(2)
        expect(getAgeHours(fetchedAt, new Date('2026-10-02T12:00:00Z'))).toBe(3)
        expect(getAgeHours(fetchedAt, new Date('2026-10-03T03:59:00Z'))).toBe(18)
    })
})

describe('isCurrentIssue', () => {
    const now = new Date('2026-10-05T11:49:00Z')

    it('accepts the current 6-hour issue in either ISO spelling', () => {
        expect(isCurrentIssue('2026-10-05T06:00:00.000Z', now)).toBe(true)
        expect(isCurrentIssue('2026-10-05T06:00Z', now)).toBe(true)
    })

    it('rejects an earlier issue', () => {
        expect(isCurrentIssue('2026-10-05T00:00:00.000Z', now)).toBe(false)
    })
})
