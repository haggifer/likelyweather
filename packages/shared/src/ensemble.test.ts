import {
    computeChanceOfRain,
    computeDisagreement,
    computeEnsemble,
    getAngularDistance,
    getCircularMedian,
    getDisagreementLabel,
    getStandardDeviation,
    median,
    quantileSorted,
} from './ensemble'
import { Variable } from './variables'

describe('quantiles', () => {
    it('interpolates linearly between sorted values', () => {
        expect(quantileSorted([1, 2, 3, 4], 0.5)).toBe(2.5)
        expect(quantileSorted([1, 2, 3, 4], 0.25)).toBe(1.75)
        expect(quantileSorted([], 0.5)).toBeNull()
        expect(median([5, 1, 3])).toBe(3)
    })
})

describe('computeEnsemble', () => {
    it('ignores missing models per step', () => {
        const stats = computeEnsemble(
            [
                [1, 10],
                [3, null],
                [2, 20],
            ],
            2,
        )

        expect(stats.median).toEqual([2, 15])
        expect(stats.min).toEqual([1, 10])
        expect(stats.max).toEqual([3, 20])
        expect(stats.count).toEqual([3, 2])
    })

    it('returns nulls when no model has a value', () => {
        const stats = computeEnsemble([[null], [null]], 1)

        expect(stats.median).toEqual([null])
        expect(stats.q1).toEqual([null])
    })
})

describe('wind direction', () => {
    it('measures angular distance across north', () => {
        expect(getAngularDistance(350, 10)).toBe(20)
        expect(getAngularDistance(90, 270)).toBe(180)
    })

    it('picks a circular median that respects wrap-around', () => {
        expect(getCircularMedian([350, 10, 5])).toBe(5)
        expect(getCircularMedian([])).toBeNull()
    })
})

describe('disagreement', () => {
    const thresholds = { agree: 2, split: 5 }

    it('labels spreads by thresholds', () => {
        expect(getDisagreementLabel(1.9, thresholds)).toBe('agree')
        expect(getDisagreementLabel(2, thresholds)).toBe('mixed')
        expect(getDisagreementLabel(5, thresholds)).toBe('split')
    })

    it('averages the model range over future steps of each local day', () => {
        const steps = ['2026-09-23T06:00Z', '2026-09-23T12:00Z', '2026-09-23T18:00Z', '2026-09-24T00:00Z']
        const series = [
            [0, 10, 12, 8],
            [0, 14, 18, 9],
        ]
        const days = computeDisagreement(steps, series, Variable.Temp, 'UTC', new Date('2026-09-23T07:00Z'))

        expect(days).toEqual([
            { day: '2026-09-23', spread: 5, label: 'split' },
            { day: '2026-09-24', spread: 1, label: 'agree' },
        ])
    })

    it('uses the range of daily totals for precipitation', () => {
        const steps = ['2026-09-23T06:00Z', '2026-09-23T12:00Z', '2026-09-24T00:00Z']
        const series = [
            [1, 2, 4],
            [0, 0, 0],
        ]
        const days = computeDisagreement(steps, series, Variable.Precip, 'UTC', new Date('2026-09-23T00:00Z'))

        expect(days[0]).toEqual({ day: '2026-09-23', spread: 7, label: 'mixed' })
    })

    it('leaves out a model whose precipitation day is incomplete instead of undercounting it', () => {
        const steps = ['2026-09-23T06:00Z', '2026-09-23T12:00Z', '2026-09-23T18:00Z', '2026-09-24T00:00Z']
        const series = [
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, null, null, 1],
        ]
        const days = computeDisagreement(steps, series, Variable.Precip, 'UTC', new Date('2026-09-23T00:00Z'))

        expect(days).toEqual([{ day: '2026-09-23', spread: 0, label: 'agree' }])
    })

    it('leaves out a day that fewer than two models cover', () => {
        const steps = ['2026-09-23T06:00Z', '2026-09-23T12:00Z']
        const days = computeDisagreement(steps, [[10, 12]], Variable.Temp, 'UTC', new Date('2026-09-23T00:00Z'))

        expect(days).toEqual([])
    })
})

describe('chance of rain', () => {
    it('is the share of models above 0.2 mm', () => {
        expect(computeChanceOfRain([[0.1], [0.5], [1], [null]], 1)).toEqual([2 / 3])
    })
})

describe('standard deviation', () => {
    it('needs at least two values', () => {
        expect(getStandardDeviation([1])).toBeNull()
        expect(getStandardDeviation([2, 4])).toBe(1)
    })
})
