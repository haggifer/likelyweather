import { getForecastAge, getForecastTitleValues } from './forecast-age'

const NOW = new Date('2026-10-09T12:00:00Z')

describe('getForecastAge', () => {
    it('stays hidden until Refresh turns on', () => {
        expect(getForecastAge('2026-10-09T10:00:00Z', NOW)).toMatchObject({ hours: 2, isShown: false })
        expect(getForecastAge('2026-10-09T09:00:00Z', NOW)).toMatchObject({ hours: 3, isShown: true, tone: 'ok' })
    })

    it('turns amber past the stale mark', () => {
        expect(getForecastAge('2026-10-09T02:00:00Z', NOW)).toMatchObject({ isStale: true, tone: 'warn' })
    })

    it('is hidden without a clock', () => {
        expect(getForecastAge('2026-10-01T00:00:00Z', null)).toMatchObject({ hours: 0, isShown: false })
    })
})

describe('getForecastTitleValues', () => {
    it('gives the run start in the city and in UTC on a 24-hour clock', () => {
        const values = getForecastTitleValues('2026-10-09T00:00:00Z', '2026-10-09T07:00:00Z', 'Europe/Kyiv', 'en')

        expect(values.utc).toBe('00:00 UTC')
        expect(values.time).toContain('03:00')
        expect(values.fetched).toContain('10:00')
    })
})
