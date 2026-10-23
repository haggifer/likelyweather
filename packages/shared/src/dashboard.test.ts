import { LatestResponse } from './api'
import {
    formatSpread,
    getDashboardStats,
    getDashboardSummaryValues,
    getFutureRange,
    getMostSplitDay,
    getReadoutLabel,
    getShownLatest,
    getSlotEnd,
    getSummaryKey,
    isComputedView,
} from './dashboard'
import { ModelId } from './models'
import { Variable } from './variables'

const STEPS = ['2030-01-01T00:00Z', '2030-01-01T03:00Z', '2030-01-01T06:00Z']
const NOW = new Date('2030-01-01T01:00Z')

const LATEST: LatestResponse = {
    issueTime: '2029-12-31T18:00Z',
    fetchedAt: '2030-01-01T00:30Z',
    runId: 'run',
    steps: STEPS,
    series: [
        { modelId: ModelId.Gfs, values: [1, 2, 3] },
        { modelId: ModelId.EcmwfIfs, values: [3, 4, 9] },
    ],
}

describe('getShownLatest', () => {
    it('leaves a hidden model out of the series, its directions and the median', () => {
        const withDirections = { ...LATEST, directions: LATEST.series }
        const shown = getShownLatest(withDirections, [ModelId.EcmwfIfs])

        expect(shown.series.map((s) => s.modelId)).toEqual([ModelId.Gfs])
        expect(shown.directions?.map((s) => s.modelId)).toEqual([ModelId.Gfs])
        expect(getDashboardStats(shown, Variable.Temp, 'UTC', NOW).stats.median).toEqual([1, 2, 3])
    })

    it('keeps the run as it is when no model is hidden', () => {
        expect(getShownLatest(LATEST, [])).toBe(LATEST)
    })
})

describe('getSlotEnd', () => {
    it('ends a slot 3 hours after it starts', () => {
        expect(getSlotEnd('2030-01-01T21:00Z')).toBe('2030-01-02T00:00Z')
    })
})

describe('getFutureRange', () => {
    it('spans only the values after now', () => {
        expect(getFutureRange([10, null, 4, 7], [...STEPS, '2030-01-01T09:00Z'], NOW)).toEqual({ min: 4, max: 7 })
    })

    it('has no range without future values', () => {
        expect(getFutureRange([1, 2, 3], STEPS, new Date('2030-02-01T00:00Z'))).toEqual({ min: null, max: null })
    })
})

describe('formatSpread', () => {
    it('keeps tenths for a whole-number variable', () => {
        expect(formatSpread(1, 0)).toBe('1.0')
        expect(formatSpread(undefined, 1)).toBe('–')
    })
})

describe('getMostSplitDay', () => {
    it('picks the widest spread, the earlier day on a tie', () => {
        const days = [
            { day: '2030-01-01', spread: 1, label: 'agree' as const },
            { day: '2030-01-02', spread: 4, label: 'split' as const },
            { day: '2030-01-03', spread: 4, label: 'split' as const },
        ]

        expect(getMostSplitDay(days)?.day).toBe('2030-01-02')
        expect(getMostSplitDay([])).toBeUndefined()
    })
})

describe('getReadoutLabel', () => {
    it('names a period for precipitation and a time otherwise', () => {
        const instant = getReadoutLabel(STEPS[1], Variable.Temp, 'UTC', 'en')
        const period = getReadoutLabel(STEPS[1], Variable.Precip, 'UTC', 'en')

        expect(period).not.toBe(instant)
        expect(period.startsWith(instant.split(' ')[0])).toBe(true)
        expect(getReadoutLabel(STEPS[1], Variable.Chance, 'UTC', 'en')).toBe(period)
    })
})

describe('the chance of rain', () => {
    // 0.1 mm stays under the 0.2 mm threshold; a step without a value leaves that model out.
    const RAIN: LatestResponse = {
        ...LATEST,
        series: [
            { modelId: ModelId.Gfs, values: [0, 0.6, 0.1] },
            { modelId: ModelId.EcmwfIfs, values: [0, 1.2, null] },
        ],
    }

    it("stands in the median's place as the percentage of models above 0.2 mm, without bands or disagreement", () => {
        const { stats, disagreement, directions } = getDashboardStats(RAIN, Variable.Chance, 'UTC', NOW)

        expect(stats.median).toEqual([0, 100, 0])
        expect(stats.min).toEqual([null, null, null])
        expect(stats.max).toEqual([null, null, null])
        expect(stats.count).toEqual([2, 2, 1])
        expect(disagreement).toEqual([])
        expect(directions).toBeNull()
    })

    it('counts only the shown models', () => {
        const shown = getShownLatest(RAIN, [ModelId.EcmwfIfs])

        expect(getDashboardStats(shown, Variable.Chance, 'UTC', NOW).stats.median).toEqual([0, 100, 0])
    })

    it('is a computed view with its own summary sentence', () => {
        expect(isComputedView(Variable.Chance)).toBe(true)
        expect(isComputedView(Variable.Precip)).toBe(false)
        expect(getSummaryKey(Variable.Chance)).toBe('summaryChance')
        expect(getSummaryKey(Variable.Precip)).toBe('summary')
    })
})

describe('getDashboardSummaryValues', () => {
    it('fills the summary from the future medians and the most split day', () => {
        const derived = getDashboardStats(LATEST, Variable.Temp, 'UTC', NOW)
        const values = getDashboardSummaryValues(LATEST, derived, Variable.Temp, NOW, 'en')

        expect(values).toMatchObject({ count: 2, min: '3.0', max: '6.0', unit: '°C', day: 'Tuesday', spread: '4.0' })
    })

    it('leaves the day empty without disagreement', () => {
        const derived = { ...getDashboardStats(LATEST, Variable.Temp, 'UTC', NOW), disagreement: [] }

        expect(getDashboardSummaryValues(LATEST, derived, Variable.Temp, NOW, 'en').day).toBe('–')
    })
})
