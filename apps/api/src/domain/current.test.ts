import { City } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { getCurrentTemperature, getMedianAt, getModelChange, pickStationReading } from './current'
import { getLatestPayload } from './latest'
import { fetchObservations, Observation } from './sources/aviation-weather'
import { fetchModelTemperature } from './sources/open-meteo-current'
import { getLatestSnapshotMeta } from './store'

vi.mock('./sources/aviation-weather', () => ({ fetchObservations: vi.fn() }))
vi.mock('./sources/open-meteo-current', () => ({ fetchModelTemperature: vi.fn() }))
vi.mock('./store', () => ({ getLatestSnapshotMeta: vi.fn() }))
vi.mock('./latest', () => ({ getLatestPayload: vi.fn() }))

const NOW = new Date('2030-01-01T18:30:00Z')
const LONDON = { lat: 51.51, lon: -0.13 }
const RUN = {
    steps: ['2030-01-01T17:00:00Z', '2030-01-01T18:00:00Z', '2030-01-01T19:00:00Z'],
    series: [{ modelId: ModelId.Gfs, values: [10, 11, 13] }],
}

let nextCityId = 1

// A fresh id per test keeps each test's answer out of the others' cache entries.
const makeCity = (elevationM?: number): City => ({
    id: nextCityId++,
    slug: 'london-gb-2643743',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    ...LONDON,
    elevationM,
    timezone: 'Europe/London',
})

const observe = (overrides: Partial<Observation> = {}): Observation => ({
    station: 'EGLC',
    name: 'London City Arpt',
    observedAt: new Date('2030-01-01T17:50:00Z'),
    temp: 12,
    position: { lat: 51.505, lon: 0.055 },
    elevationM: 10,
    ...overrides,
})

describe('pickStationReading', () => {
    it('takes the nearest station within 25 km, and its newest report', () => {
        const near = observe({ observedAt: new Date('2030-01-01T17:20:00Z') })
        const nearNewer = observe({ observedAt: new Date('2030-01-01T17:50:00Z') })
        const farther = observe({ station: 'EGLL', position: { lat: 51.477, lon: -0.461 } })

        const reading = pickStationReading([farther, near, nearNewer], LONDON, NOW)

        expect(reading?.observation).toBe(nearNewer)
        expect(reading?.distanceKm).toBeCloseTo(13, 0)
    })

    it('leaves out a station beyond 25 km, a report older than 75 minutes and one from the future', () => {
        const tooFar = observe({ position: { lat: 51.75, lon: -0.6 } })
        const tooOld = observe({ observedAt: new Date('2030-01-01T17:14:00Z') })
        const future = observe({ observedAt: new Date('2030-01-01T18:31:00Z') })

        expect(pickStationReading([tooFar, tooOld, future], LONDON, NOW)).toBeNull()
    })
})

describe('getMedianAt', () => {
    it('interpolates between the hourly steps and has nothing outside the run', () => {
        expect(getMedianAt(RUN, new Date('2030-01-01T17:30:00Z'))).toBe(10.5)
        expect(getMedianAt(RUN, new Date('2030-01-01T18:00:00Z'))).toBe(11)
        expect(getMedianAt(RUN, new Date('2030-01-01T16:00:00Z'))).toBeNull()
        expect(getMedianAt(RUN, new Date('2030-01-01T19:00:00Z'))).toBeNull()
    })
})

describe('getModelChange', () => {
    it('is the models’ change between the report and now, or none without a run', () => {
        expect(getModelChange(RUN, new Date('2030-01-01T17:30:00Z'), NOW)).toBe(1.5)
        expect(getModelChange(null, new Date('2030-01-01T17:30:00Z'), NOW)).toBe(0)
    })
})

describe('getCurrentTemperature', () => {
    beforeEach(() => {
        vi.mocked(fetchObservations).mockReset()
        vi.mocked(fetchModelTemperature).mockReset()
        vi.mocked(getLatestSnapshotMeta).mockResolvedValue({} as never)
        vi.mocked(getLatestPayload).mockResolvedValue(RUN as never)
    })

    it('carries the station reading forward by the models’ change and corrects it for height', async () => {
        vi.mocked(fetchObservations).mockResolvedValue([observe({ elevationM: 210 })])

        const current = await getCurrentTemperature(makeCity(10), NOW)

        // 12 °C at 210 m is 13.3 °C at 10 m; the models' median warms from 10.83 °C at 17:50 to 12 °C at 18:30.
        expect(current).toEqual({
            temp: 14.5,
            source: 'station',
            observedAt: '2030-01-01T17:50:00.000Z',
            station: { id: 'EGLC', name: 'London City Arpt', distanceKm: 12.8 },
        })
        expect(fetchModelTemperature).not.toHaveBeenCalled()
    })

    it('falls back to the model value without a qualifying station, or when the reports are unavailable', async () => {
        vi.mocked(fetchModelTemperature).mockResolvedValue({ time: new Date('2030-01-01T18:30:00Z'), temp: 9.84 })
        vi.mocked(fetchObservations).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('503'))

        const expected = { temp: 9.8, source: 'model', observedAt: '2030-01-01T18:30:00.000Z' }

        expect(await getCurrentTemperature(makeCity(), NOW)).toEqual(expected)
        expect(await getCurrentTemperature(makeCity(), NOW)).toEqual(expected)
    })

    it('works a city out once per quarter hour', async () => {
        vi.mocked(fetchObservations).mockResolvedValue([observe()])
        const city = makeCity()

        await getCurrentTemperature(city, NOW)
        await getCurrentTemperature(city, new Date('2030-01-01T18:44:00Z'))
        await getCurrentTemperature(city, new Date('2030-01-01T18:45:00Z'))

        expect(fetchObservations).toHaveBeenCalledTimes(2)
    })
})
