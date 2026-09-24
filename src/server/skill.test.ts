import { collectErrors, computeConsensusTruth, computeSkillCells, summarizeErrors } from '@/server/skill'
import { PreviousRunsData } from '@/server/sources/previousRuns'
import { ModelId } from '@/shared/models'
import { Variable } from '@/shared/variables'

const STEPS = ['2026-09-20T00:00Z', '2026-09-20T06:00Z', '2026-09-20T12:00Z']
const NOW = new Date('2026-09-21T00:00Z')

// byDay[0] is the analysis proxy, byDay[1] the forecast issued a day earlier.
const model = (analysis: (number | null)[], dayOne: (number | null)[]) => [analysis, dayOne, [], [], []]

const DATA: PreviousRunsData = {
    steps: STEPS,
    models: {
        [ModelId.EcmwfIfs]: model([10, 11, 12], [11, 11, 14]),
        [ModelId.Gfs]: model([10, 12, 12], [8, 12, 12]),
        [ModelId.Gem]: model([11, 11, 13], [11, 11, 13]),
        [ModelId.Ukmo]: model([9, 11, 12], [9, 13, 12]),
        [ModelId.Jma]: model([10, null, 12], [10, 11, 12]),
    },
}

describe('consensus truth', () => {
    it('is the median of analyses with at least five contributors', () => {
        expect(computeConsensusTruth(DATA)).toEqual([10, null, 12])
    })
})

describe('errors and summaries', () => {
    it('pairs forecasts with truth and skips steps without truth or in the future', () => {
        const truth = computeConsensusTruth(DATA)
        const records = collectErrors(STEPS, DATA.models[ModelId.EcmwfIfs]!, 1, truth, Variable.Temp, NOW)

        expect(records.map((r) => r.error)).toEqual([1, 2])
        expect(
            collectErrors(
                STEPS,
                DATA.models[ModelId.EcmwfIfs]!,
                1,
                truth,
                Variable.Temp,
                new Date('2026-09-20T01:00Z'),
            ),
        ).toHaveLength(1)
    })

    it('computes MAE, bias, RMSE and precipitation hit rate', () => {
        const stats = summarizeErrors([
            { validTime: 'a', day: 'd', forecast: 1, truth: 0, error: 1, hit: true },
            { validTime: 'b', day: 'd', forecast: 0, truth: 3, error: -3, hit: false },
        ])

        expect(stats).toEqual({ n: 2, mae: 2, bias: -1, rmse: 2.236, hitRate: 0.5 })
        expect(summarizeErrors([]).mae).toBeNull()
    })
})

describe('skill cells', () => {
    it('produces one cell per model and lead bucket', () => {
        const cells = computeSkillCells(DATA, Variable.Temp, 'consensus', ['2026-09-20'], NOW)
        const ifs24 = cells.find((c) => c.modelId === ModelId.EcmwfIfs && c.leadBucket === 24)!

        expect(cells).toHaveLength(5 * 4)
        expect(ifs24).toMatchObject({ n: 2, mae: 1.5, bias: 1.5, spark: [1.5] })
        expect(ifs24.worst[0]).toMatchObject({ validTime: '2026-09-20T12:00Z', error: 2 })
    })

    it('scores against the model’s own analysis in self mode', () => {
        const cells = computeSkillCells(DATA, Variable.Temp, 'self', ['2026-09-20'], NOW)
        const gfs24 = cells.find((c) => c.modelId === ModelId.Gfs && c.leadBucket === 24)!

        expect(gfs24).toMatchObject({ n: 3, mae: 0.667, bias: -0.667 })
    })
})
