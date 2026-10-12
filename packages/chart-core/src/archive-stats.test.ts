import { ArchiveResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { getArchiveDirections, getArchiveSeries } from './archive-stats'

const STEPS = Array.from({ length: 6 }, (_, h) => `2026-10-10T0${h}:00Z`)
const list = (f: (h: number) => number) => STEPS.map((_, h) => f(h))
const ARCHIVE: ArchiveResponse = {
    from: '2026-10-10',
    to: '2026-10-10',
    steps: STEPS,
    values: {
        temp: list((h) => 10 + h),
        feels: list((h) => 8 + h),
        wind: list(() => 3),
        gusts: list(() => 6),
        windDir: list(() => 270),
        pressure: list(() => 1012),
        precip: list((h) => h / 10),
        humidity: list(() => 80),
        cloud: list(() => 50),
    },
}
const SLOTS = ['2026-10-10T00:00Z', '2026-10-10T03:00Z']

describe('getArchiveSeries', () => {
    it('reads instants at each slot and sums the three hours after it, like the forecasts', () => {
        const series = getArchiveSeries(ARCHIVE, SLOTS)

        expect(series[Variable.Temp]?.values).toEqual([10, 13])
        expect(series[Variable.Feels]?.values).toEqual([8, 11])
        expect(series[Variable.Precip]?.values[0]).toBeCloseTo(0.1 + 0.2 + 0.3)
        expect(series[Variable.Cloud]?.values).toEqual([50, 50])
    })

    it('gives the wind its direction per slot', () => {
        expect(getArchiveDirections(ARCHIVE, SLOTS)).toEqual([270, 270])
    })
})
