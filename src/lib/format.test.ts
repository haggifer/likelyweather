import { getLocalMidnights, getTimeZoneOffsetMinutes } from '@/lib/format'

describe('time zones', () => {
    it('computes offsets including DST', () => {
        expect(getTimeZoneOffsetMinutes(new Date('2026-07-01T12:00Z'), 'Europe/Kyiv')).toBe(180)
        expect(getTimeZoneOffsetMinutes(new Date('2026-01-15T12:00Z'), 'Europe/Kyiv')).toBe(120)
        expect(getTimeZoneOffsetMinutes(new Date('2026-01-15T12:00Z'), 'America/New_York')).toBe(-300)
    })

    it('lists local midnights inside a UTC range', () => {
        const midnights = getLocalMidnights(new Date('2026-09-22T12:00Z'), new Date('2026-09-24T12:00Z'), 'Europe/Kyiv')

        expect(midnights.map((d) => d.toISOString())).toEqual(['2026-09-22T21:00:00.000Z', '2026-09-23T21:00:00.000Z'])
    })
})
