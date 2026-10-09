import { LatestResponse } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { buildWidgetModel, getShownModel, isNewerRun, WidgetCity } from './widget-model'

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

    it('falls back to UTC days while the city’s time zone is unknown', () => {
        const model = buildWidgetModel({ ...CITY, timezone: null }, { temp: makeLatest([10, 12, 14]) }, NOW)

        expect(model.temp).toBe(12)
        expect(model.label).not.toBeNull()
    })
})

describe('isNewerRun', () => {
    const saved = (fetchedAt: string, city = CITY) => ({ city, fetchedAt })

    it('is true with nothing saved or a later fetch, false for the same or an earlier one', () => {
        expect(isNewerRun(null, CITY.slug, FETCHED_AT)).toBe(true)
        expect(isNewerRun(saved('2026-10-06T06:05:00.000Z'), CITY.slug, FETCHED_AT)).toBe(true)
        expect(isNewerRun(saved(FETCHED_AT), CITY.slug, FETCHED_AT)).toBe(false)
        expect(isNewerRun(saved('2026-10-06T12:05:00.000Z'), CITY.slug, FETCHED_AT)).toBe(false)
    })

    it('replaces a model saved for another city, whatever its age', () => {
        const other = { ...CITY, slug: 'kyiv-ua-703448', name: 'Kyiv' }

        expect(isNewerRun(saved('2026-10-06T12:05:00.000Z', other), CITY.slug, FETCHED_AT)).toBe(true)
    })
})

describe('getShownModel', () => {
    const KYIV: WidgetCity = { ...CITY, id: 703448, slug: 'kyiv-ua-703448', name: 'Kyiv' }
    const model = buildWidgetModel(CITY, { temp: makeLatest([10, 12, 14]) }, NOW)

    it('shows the model saved for the bound city', () => {
        expect(getShownModel(CITY, model, NOW)).toBe(model)
    })

    it('never shows numbers saved for another city under the bound city’s name', () => {
        expect(getShownModel(KYIV, model, NOW)).toBeNull()
    })

    it('shows nothing without a bound city or a saved model', () => {
        expect(getShownModel(null, model, NOW)).toBeNull()
        expect(getShownModel(CITY, null, NOW)).toBeNull()
    })

    it('drops the agreement label once its day has passed in the city', () => {
        const nextMorning = new Date('2026-10-07T06:00:00Z')

        expect(model.labelDay).toBe('2026-10-06')
        expect(getShownModel(CITY, model, nextMorning)).toMatchObject({ temp: 12, label: null })
    })

    it('holds back a label about tomorrow, built after the day’s last slot', () => {
        const lateEvening = new Date('2026-10-06T19:30:00Z')
        const late = buildWidgetModel(CITY, { temp: makeLatest([10, 12, 14]) }, lateEvening)

        expect(late.labelDay).toBe('2026-10-07')
        expect(getShownModel(CITY, late, lateEvening)?.label).toBeNull()
        expect(getShownModel(CITY, late, new Date('2026-10-07T06:00:00Z'))?.label).toBe('mixed')
    })
})
