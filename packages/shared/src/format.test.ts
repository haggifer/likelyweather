import { formatDateKey, formatDayLabel, formatPeriodLabel, getLocalMidnights, getTimeZoneOffsetMinutes } from './format'

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

describe('formatDateKey', () => {
    it('formats a local date key as that calendar day in any time zone', () => {
        expect(formatDateKey('2026-10-02', 'en', { weekday: 'long', day: 'numeric' })).toBe('Friday 2')
    })
})
