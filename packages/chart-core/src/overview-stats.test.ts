import { LatestResponse } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { OVERVIEW_VARIABLES, Variable } from '@fa/shared/variables'
import {
    getHourlyByVariable,
    getOverviewChance,
    getOverviewMedians,
    getOverviewRun,
    getOverviewSeries,
    getReadyPanels,
    OverviewHourly,
} from './overview-stats'

const STEPS = ['2026-10-12T00:00Z', '2026-10-12T01:00Z', '2026-10-12T02:00Z', '2026-10-12T03:00Z']
const SLOTS = ['2026-10-12T00:00Z', '2026-10-12T03:00Z']

const toLatest = (values: (number | null)[][]): LatestResponse => ({
    issueTime: '2026-10-12T00:00Z',
    fetchedAt: '2026-10-12T00:10:00.000Z',
    runId: 'test',
    steps: STEPS,
    series: values.map((v, i) => ({ modelId: [ModelId.EcmwfIfs, ModelId.Gfs, ModelId.Gem][i], values: v })),
})

describe('getOverviewChance', () => {
    it('is the share of models above 0.2 mm in the 3 hours after each slot', () => {
        // The first slot sums the hours ending at 01:00, 02:00 and 03:00: 0.3, 0.1 and 0 mm.
        const precip = toLatest([
            [null, 0.1, 0.1, 0.1],
            [null, 0, 0.05, 0.05],
            [null, 0, 0, 0],
        ])

        expect(getOverviewChance(precip, SLOTS)[0]).toBeCloseTo(1 / 3)
    })
})

describe('getOverviewMedians', () => {
    it('gives every drawn variable its median per slot', () => {
        const latest = toLatest([
            [10, 11, 12, 13],
            [12, 13, 14, 15],
            [14, 15, 16, 17],
        ])
        const hourly = Object.fromEntries(OVERVIEW_VARIABLES.map((v) => [v, latest])) as OverviewHourly
        const medians = getOverviewMedians(hourly, SLOTS)

        expect(Object.keys(medians)).toEqual([...OVERVIEW_VARIABLES])
        expect(medians[Variable.Feels]?.values[0]).toBe(12)
    })

    it('leaves out the variables that were not fetched', () => {
        const latest = toLatest([[10, 11, 12, 13]])
        const medians = getOverviewMedians({ [Variable.Temp]: latest, [Variable.Cloud]: latest }, SLOTS)

        expect(Object.keys(medians)).toEqual([Variable.Temp, Variable.Cloud])
    })
})

describe('getHourlyByVariable', () => {
    it('keys each arrived run by its variable, in the queries order', () => {
        const temp = toLatest([[10, 11, 12, 13]])
        const results = OVERVIEW_VARIABLES.map((variable) => ({ data: variable === Variable.Temp ? temp : undefined }))

        expect(getHourlyByVariable(results)).toEqual({ [Variable.Temp]: temp })
        expect(getHourlyByVariable([])).toEqual({})
    })
})

describe('getReadyPanels', () => {
    it('keeps a panel once its series and its second line have arrived', () => {
        const latest = toLatest([[10, 11, 12, 13]])
        const hourly = { [Variable.Temp]: latest, [Variable.Wind]: latest, [Variable.Gusts]: latest }

        expect(getReadyPanels([Variable.Temp, Variable.Wind, Variable.Pressure], hourly)).toEqual([Variable.Wind])
    })
})

describe('getOverviewRun', () => {
    it('is the first shown panel run', () => {
        const temp = toLatest([[10, 11, 12, 13]])
        const wind = toLatest([[1, 2, 3, 4]])

        expect(getOverviewRun({ [Variable.Temp]: temp, [Variable.Wind]: wind }, [Variable.Wind, Variable.Temp])).toBe(
            wind,
        )
    })
})

describe('getOverviewSeries', () => {
    it('draws ten days of 3-hour slots from the anchor, without directions or rain when they did not arrive', () => {
        const series = getOverviewSeries({ [Variable.Temp]: toLatest([[10, 11, 12, 13]]) }, new Date(STEPS[0]))

        expect(series.medians[Variable.Temp]?.steps[0]).toBe(STEPS[0])
        expect(series.medians[Variable.Temp]?.values[0]).toBe(10)
        expect(series.medians[Variable.Temp]?.steps).toHaveLength(81)
        expect(series.directions).toBeNull()
        expect(series.chance).toEqual([])
    })
})
