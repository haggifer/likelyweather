import { LatestResponse } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { TemperatureTrend } from '@fa/shared/temperature-trend'
import { WeatherCondition } from '@fa/shared/weather-condition'
import { buildWidgetModel, getShownModel, WidgetCity } from './widget-model'

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

// Three models holding one value each, or a value that changes by `perHour`, so every median is known in advance.
const makeLatest = (values: [number, number, number], perHour = 0): LatestResponse => ({
    issueTime: '2026-10-06T06:00:00.000Z',
    fetchedAt: FETCHED_AT,
    runId: 'test',
    steps: STEPS,
    series: [ModelId.Gfs, ModelId.EcmwfIfs, ModelId.IconEu].map((modelId, i) => ({
        modelId,
        values: STEPS.map((_, step) => values[i] + perHour * step),
    })),
})

const CURRENT = { temp: 11.4, source: 'model' as const, observedAt: '2026-10-06T12:00:00.000Z' }

describe('buildWidgetModel', () => {
    it('gives the medians’ temperature and sky now, the temperature’s trend and the current temperature', () => {
        const model = buildWidgetModel(
            CITY,
            {
                temp: makeLatest([10, 12, 14], 0.5),
                cloud: makeLatest([40, 50, 60]),
                precip: makeLatest([0, 0, 0]),
                current: CURRENT,
            },
            NOW,
        )

        expect(model).toEqual({
            city: CITY,
            temp: 15,
            condition: WeatherCondition.PartlyCloudy,
            trend: TemperatureTrend.Rising,
            current: CURRENT,
        })
    })

    it('reads rain from the slot the time is in, summed over its 3 hours', () => {
        const model = buildWidgetModel(
            CITY,
            {
                temp: makeLatest([10, 12, 14]),
                cloud: makeLatest([90, 95, 100]),
                precip: makeLatest([0.2, 0.2, 0.2]),
                current: null,
            },
            NOW,
        )

        expect(model).toMatchObject({ condition: WeatherCondition.Rain, trend: TemperatureTrend.Steady, current: null })
    })
})

describe('getShownModel', () => {
    const KYIV: WidgetCity = { ...CITY, id: 703448, slug: 'kyiv-ua-703448', name: 'Kyiv' }
    const model = buildWidgetModel(
        CITY,
        { temp: makeLatest([10, 12, 14]), cloud: makeLatest([0, 0, 0]), precip: makeLatest([0, 0, 0]), current: null },
        NOW,
    )

    it('shows the model saved for the bound city', () => {
        expect(getShownModel(CITY, model)).toBe(model)
    })

    it('never shows numbers saved for another city under the bound city’s name', () => {
        expect(getShownModel(KYIV, model)).toBeNull()
    })

    it('shows nothing without a bound city or a saved model', () => {
        expect(getShownModel(null, model)).toBeNull()
        expect(getShownModel(CITY, null)).toBeNull()
    })
})
