import {
    formatClockTime,
    formatDateKey,
    formatDayLabel,
    formatNumber,
    formatPeriodLabel,
    formatTableStepLabel,
    formatWindDirection,
    getLocalMidnights,
    getTimeZoneOffsetMinutes,
} from './format'

describe('time zones', () => {
    it('computes offsets including DST', () => {
        expect(getTimeZoneOffsetMinutes(new Date('2026-07-01T12:00Z'), 'Europe/Kyiv')).toBe(180)
        expect(getTimeZoneOffsetMinutes(new Date('2026-01-15T12:00Z'), 'Europe/Kyiv')).toBe(120)
        expect(getTimeZoneOffsetMinutes(new Date('2026-01-15T12:00Z'), 'America/New_York')).toBe(-300)
    })

    it('finds local midnight on the days Sydney changes its clocks', () => {
        const spring = getLocalMidnights(
            new Date('2026-10-03T00:00Z'),
            new Date('2026-10-05T00:00Z'),
            'Australia/Sydney',
        )
        const autumn = getLocalMidnights(
            new Date('2026-04-04T00:00Z'),
            new Date('2026-04-06T00:00Z'),
            'Australia/Sydney',
        )

        expect(spring.map((d) => d.toISOString())).toEqual(['2026-10-03T14:00:00.000Z', '2026-10-04T13:00:00.000Z'])
        expect(autumn.map((d) => d.toISOString())).toEqual(['2026-04-04T13:00:00.000Z', '2026-04-05T14:00:00.000Z'])
    })

    it('starts a day at 01:00 where the clocks jump forward at midnight', () => {
        const midnights = getLocalMidnights(
            new Date('2026-09-05T12:00Z'),
            new Date('2026-09-07T12:00Z'),
            'America/Santiago',
        )

        expect(midnights.map((d) => d.toISOString())).toEqual(['2026-09-06T04:00:00.000Z', '2026-09-07T03:00:00.000Z'])
    })

    it('lists local midnights inside a UTC range', () => {
        const midnights = getLocalMidnights(new Date('2026-09-22T12:00Z'), new Date('2026-09-24T12:00Z'), 'Europe/Kyiv')

        expect(midnights.map((d) => d.toISOString())).toEqual(['2026-09-22T21:00:00.000Z', '2026-09-23T21:00:00.000Z'])
    })
})

describe('period labels', () => {
    it('labels a span by its local start day and both clock times', () => {
        expect(formatPeriodLabel('2026-09-26T07:00Z', '2026-09-26T10:00Z', 'America/New_York', 'en')).toBe(
            'Sat 03:00–06:00',
        )
        expect(formatPeriodLabel('2026-09-26T01:00Z', '2026-09-26T04:00Z', 'America/New_York', 'en')).toBe(
            'Fri 21:00–00:00',
        )
    })
})

describe('day labels', () => {
    it('formats a day in three lengths', () => {
        expect(formatDayLabel('2026-09-26T12:00Z', 'UTC', 'en')).toBe('Sat 26 Sept')
        expect(formatDayLabel('2026-09-26T12:00Z', 'UTC', 'en', 'short')).toBe('Sat 26')
        expect(formatDayLabel('2026-09-26T12:00Z', 'UTC', 'en', 'narrow')).toBe('Sat')
    })
})

describe('table step labels', () => {
    it('tells the same weekday and hour a week apart by their dates, in the city zone', () => {
        expect(formatTableStepLabel('2026-09-17T03:00Z', 'Europe/Kyiv', 'en')).toBe('Thu 17 Sept, 06:00')
        expect(formatTableStepLabel('2026-09-24T03:00Z', 'Europe/Kyiv', 'en')).toBe('Thu 24 Sept, 06:00')
        expect(formatTableStepLabel('2026-09-17T03:00Z', 'Europe/Kyiv', 'uk')).toBe('чт, 17 вер., 06:00')
    })
})

describe('formatDateKey', () => {
    it('formats a local date key as that calendar day in any time zone', () => {
        expect(formatDateKey('2026-10-02', 'en', { weekday: 'long', day: 'numeric' })).toBe('Friday 2')
    })
})

describe('formatClockTime', () => {
    it('reads 12-hour in English and 24-hour in the other languages', () => {
        const midnightKyiv = '2026-10-06T21:00:00Z'

        expect(formatClockTime(midnightKyiv, 'Europe/Kyiv', 'en')).toBe('12:00 AM')
        expect(formatClockTime('2026-10-07T00:00:00Z', 'Europe/Kyiv', 'en')).toBe('3:00 AM')
        expect(formatClockTime(midnightKyiv, 'Europe/Kyiv', 'uk')).toBe('00:00')
        expect(formatClockTime(midnightKyiv, 'Europe/Kyiv', 'de')).toBe('00:00')
    })
})

describe('formatNumber', () => {
    it('never shows a sign on a value that rounds to zero', () => {
        expect(formatNumber(-0.04, 1)).toBe('0.0')
        expect(formatNumber(-0.4, 0)).toBe('0')
        expect(formatNumber(-0.06, 1)).toBe('-0.1')
        expect(formatNumber(null)).toBe('–')
    })
})

describe('formatWindDirection', () => {
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

    it('names the nearest compass point and rounds the degrees', () => {
        expect(formatWindDirection(224.6, points)).toBe('SW 225°')
        expect(formatWindDirection(350, points)).toBe('N 350°')
    })

    it('wraps directions outside 0–360', () => {
        expect(formatWindDirection(-45, points)).toBe('NW 315°')
        expect(formatWindDirection(359.7, points)).toBe('N 0°')
    })
})
