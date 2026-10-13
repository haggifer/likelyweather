import { parseDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import { isCityToday, isOutsideArchiveSpan, toArchiveRange, toCalendarRange } from './archive-calendar'

describe('archive calendar ranges', () => {
    it('converts the period to calendar dates and back', () => {
        const range = { from: '2026-09-30', to: '2026-10-11' }
        const calendar = toCalendarRange(range)

        expect(calendar.start.toString()).toBe('2026-09-30')
        expect(calendar.end.day).toBe(11)
        expect(toArchiveRange(calendar)).toEqual(range)
    })
})

describe('isOutsideArchiveSpan', () => {
    const anchor = parseDate('2026-09-30')

    it('opens every day before the first tap', () => {
        expect(isOutsideArchiveSpan(parseDate('1940-01-01'), null)).toBe(false)
    })

    it('ends a period on the first day or one of the 11 after it, twelve days at most', () => {
        expect(isOutsideArchiveSpan(anchor, anchor)).toBe(false)
        expect(isOutsideArchiveSpan(parseDate('2026-10-11'), anchor)).toBe(false)
        expect(isOutsideArchiveSpan(parseDate('2026-10-12'), anchor)).toBe(true)
        expect(isOutsideArchiveSpan(parseDate('2026-09-29'), anchor)).toBe(true)
    })
})

describe('isCityToday', () => {
    it("marks the city's today, the day after the archive's last day, whatever the viewer's date", () => {
        expect(isCityToday(parseDate('2026-10-13'), '2026-10-12')).toBe(true)
        expect(isCityToday(parseDate('2026-10-14'), '2026-10-12')).toBe(false)
    })
})
