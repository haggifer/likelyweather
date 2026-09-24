import { indexHourlyTimes, toStepSeries } from '@/server/resample'

const TIMES = Array.from({ length: 13 }, (_, h) => `2026-09-23T${String(h).padStart(2, '0')}:00`)

describe('toStepSeries', () => {
    const index = indexHourlyTimes(TIMES)

    it('samples instant variables at the step', () => {
        const values = TIMES.map((_, h) => h * 10)

        expect(toStepSeries(index, values, ['2026-09-23T06:00Z', '2026-09-23T12:00Z'], 'instant')).toEqual([60, 120])
    })

    it('sums the six hours ending at the step', () => {
        const values = TIMES.map(() => 0.5)

        expect(toStepSeries(index, values, ['2026-09-23T06:00Z', '2026-09-23T12:00Z'], 'sum')).toEqual([3, 3])
    })

    it('returns null for a sum with a missing hour instead of undercounting', () => {
        const values = TIMES.map((_, h) => (h === 10 ? null : 1))

        expect(toStepSeries(index, values, ['2026-09-23T06:00Z', '2026-09-23T12:00Z'], 'sum')).toEqual([6, null])
    })

    it('returns nulls outside the fetched range or without values', () => {
        expect(
            toStepSeries(
                index,
                TIMES.map(() => 1),
                ['2026-09-22T18:00Z'],
                'instant',
            ),
        ).toEqual([null])
        expect(toStepSeries(index, undefined, ['2026-09-23T06:00Z'], 'instant')).toEqual([null])
    })
})
