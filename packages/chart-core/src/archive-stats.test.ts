import { ArchiveResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { getArchiveHourlySeries } from './archive-stats'

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
describe('getArchiveHourlySeries', () => {
    it('keeps every hour as it comes', () => {
        const series = getArchiveHourlySeries(ARCHIVE)

        expect(series[Variable.Temp]).toEqual({ steps: STEPS, values: [10, 11, 12, 13, 14, 15] })
        expect(series[Variable.Precip]?.steps).toEqual(STEPS)
        expect(series[Variable.Precip]?.values).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
    })
})
