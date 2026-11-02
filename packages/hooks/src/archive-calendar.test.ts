import { parseDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import {
    CALENDAR_WEEKS,
    getYears,
    isCityToday,
    isOutsideArchiveSpan,
    moveToYear,
    padWeeks,
    toArchiveRange,
    toCalendarRange,
} from './archive-calendar'

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

describe('padWeeks', () => {
    it('fills a short month with empty weeks, so every month has the same rows', () => {
        const february = Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => parseDate('2027-02-01')))
        const padded = padWeeks(february)

        expect(padded).toHaveLength(CALENDAR_WEEKS)
        expect(padded[4]).toEqual(Array(7).fill(null))
        expect(padded[0]).toBe(february[0])
    })

    it('leaves a 6-week month as it is', () => {
        const weeks = Array.from({ length: CALENDAR_WEEKS }, () => Array(7).fill(null))

        expect(padWeeks(weeks)).toHaveLength(CALENDAR_WEEKS)
    })
})

describe('getYears', () => {
    it('lists every year from the first to the last date, both included', () => {
        const years = getYears(parseDate('1940-01-01'), parseDate('2026-11-01'))

        expect(years[0]).toBe(1940)
        expect(years.at(-1)).toBe(2026)
        expect(years).toHaveLength(87)
    })
})

describe('moveToYear', () => {
    const last = parseDate('2026-11-01')

    it('keeps the month and day in the other year', () => {
        expect(moveToYear(parseDate('2026-03-15'), 1999, last).toString()).toBe('1999-03-15')
    })

    it('moves 29 February to the 28th in a year without it', () => {
        expect(moveToYear(parseDate('2024-02-29'), 2023, last).toString()).toBe('2023-02-28')
    })

    it('stops at yesterday in this year', () => {
        expect(moveToYear(parseDate('2025-12-20'), 2026, last).toString()).toBe('2026-11-01')
    })
})
