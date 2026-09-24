import { MetnoBody, parseMetno } from '@/server/sources/metno'

const entry = (
    time: string,
    temp: number,
    extra: Partial<MetnoBody['properties']['timeseries'][number]['data']> = {},
) => ({
    time,
    data: {
        instant: {
            details: { air_temperature: temp, wind_speed: 3, wind_from_direction: 90, air_pressure_at_sea_level: 1012 },
        },
        ...extra,
    },
})

const BODY: MetnoBody = {
    properties: {
        meta: { updated_at: '2026-09-23T12:00:00Z' },
        timeseries: [
            entry('2026-09-23T12:00:00Z', 15, { next_6_hours: { details: { precipitation_amount: 2.4 } } }),
            ...[13, 14, 15, 16, 17].map((h) =>
                entry(`2026-09-23T${h}:00:00Z`, 14, { next_1_hours: { details: { precipitation_amount: 0.1 } } }),
            ),
            entry('2026-09-23T18:00:00Z', 12, { next_6_hours: { details: { precipitation_amount: 0 } } }),
            entry('2026-09-24T00:00:00Z', 10),
        ],
    },
}

describe('parseMetno', () => {
    it('reads instant values at steps and the 6-hour amount ending at each step', () => {
        const series = parseMetno(BODY, ['2026-09-23T12:00Z', '2026-09-23T18:00Z', '2026-09-24T00:00Z'])!

        expect(series.temp).toEqual([15, 12, 10])
        expect(series.pressure).toEqual([1012, 1012, 1012])
        expect(series.precip).toEqual([null, 2.4, 0])
        expect(series.pressureSfc).toEqual([null, null, null])
    })

    it('reads the hourly amount ending at each step on an hourly grid', () => {
        const series = parseMetno(BODY, ['2026-09-23T13:00Z', '2026-09-23T14:00Z', '2026-09-23T18:00Z'], 1)!

        expect(series.temp).toEqual([14, 14, 12])
        expect(series.precip).toEqual([null, 0.1, 0.1])
    })

    it('returns null when no step has data', () => {
        expect(parseMetno(BODY, ['2026-10-01T00:00Z'])).toBeNull()
    })
})
