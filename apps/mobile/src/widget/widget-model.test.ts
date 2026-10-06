import { LatestResponse } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { buildWidgetModel, WidgetCity } from './widget-model'

const HOUR_MS = 3_600_000
const FETCHED_AT = '2026-10-06T09:05:00.000Z'
const NOW = new Date('2026-10-06T12:00:00Z')
const START = Date.parse('2026-10-06T06:00:00Z')
// The API's step format: ISO minutes in UTC.
const STEPS = Array.from({ length: 112 }, (_, i) => `${new Date(START + i * HOUR_MS).toISOString().slice(0, 16)}Z`)

const CITY: WidgetCity = {
    id: 706483,
    slug: 'kharkiv-ua-706483',
    name: 'Kharkiv',
    country: 'Ukraine',
    countryCode: 'UA',
    timezone: 'Europe/Kyiv',
}

// Three models holding one value each, so every median and range is known in advance.
const makeLatest = (values: [number, number, number]): LatestResponse => ({
    issueTime: '2026-10-06T06:00:00.000Z',
    fetchedAt: FETCHED_AT,
    runId: 'test',
    steps: STEPS,
    series: [ModelId.Gfs, ModelId.EcmwfIfs, ModelId.IconEu].map((modelId, i) => ({
        modelId,
        values: STEPS.map(() => values[i]),
    })),
})

describe('buildWidgetModel', () => {
    it('gives the current median, the next 24 hours and today’s agreement for the medium widget', () => {
        const model = buildWidgetModel(
            CITY,
            { temp: makeLatest([10, 12, 14]), wind: makeLatest([4, 5, 6]), precip: makeLatest([0.5, 0.5, 0.5]) },
            NOW,
        )

        expect(model).toMatchObject({
            temp: 12,
            tempMin: 12,
            tempMax: 12,
            wind: 5,
            label: 'mixed',
            fetchedAt: FETCHED_AT,
        })
        expect(model.precipTotal).toBeCloseTo(12, 6)
    })

    it('leaves wind and rain unknown for the small widget, which fetches temperature only', () => {
        const model = buildWidgetModel(CITY, { temp: makeLatest([10, 10.5, 11]) }, NOW)

        expect(model).toMatchObject({ temp: 10.5, label: 'agree', wind: null, precipTotal: null })
    })

    it('shows a rain total as unknown when the run ends before the 24 hours do', () => {
        const short = { ...makeLatest([1, 1, 1]), steps: STEPS.slice(0, 20) }
        const model = buildWidgetModel(CITY, { temp: makeLatest([10, 12, 14]), precip: short }, NOW)

        expect(model.precipTotal).toBeNull()
    })
})
