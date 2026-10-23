import { City, CurrentResponse, LatestResponse } from '@fa/shared/api'
import { getEnsembleStats } from '@fa/shared/dashboard'
import { Coordinates, getDistanceKm } from '@fa/shared/geo'
import { Variable } from '@fa/shared/variables'
import { cached } from './cache'
import { getErrorMessage } from './errors'
import { getLatestPayload } from './latest'
import { fetchObservations, Observation } from './sources/aviation-weather'
import { fetchModelTemperature } from './sources/open-meteo-current'
import { getLatestSnapshotMeta } from './store'

const STATION_RADIUS_KM = 25
// Airports report about once an hour, a few minutes before it; 75 minutes keeps the last report until the next one.
const MAX_OBSERVATION_AGE_MS = 75 * 60 * 1000
// The standard atmosphere's 6.5 °C per kilometre: a station above the city reads colder than the city is.
const LAPSE_RATE_PER_M = 0.0065
const QUARTER_HOUR_MS = 15 * 60 * 1000

interface StationReading {
    observation: Observation
    distanceKm: number
}

type TemperatureRun = Pick<LatestResponse, 'steps' | 'series'>

const roundTenth = (value: number) => Math.round(value * 10) / 10

const getQuarterHourEnd = (now: Date) => Math.floor(now.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS + QUARTER_HOUR_MS

// Seconds until the next quarter hour, when the answer is worked out again.
export const getCurrentMaxAge = (now: Date) => Math.ceil((getQuarterHourEnd(now) - now.getTime()) / 1000)

const byDistanceThenNewest = (a: StationReading, b: StationReading) =>
    a.distanceKm - b.distanceKm || b.observation.observedAt.getTime() - a.observation.observedAt.getTime()

export const pickStationReading = (observations: Observation[], place: Coordinates, now: Date) => {
    const readings = observations
        .filter(({ observedAt }) => observedAt <= now && now.getTime() - observedAt.getTime() <= MAX_OBSERVATION_AGE_MS)
        .map((observation) => ({ observation, distanceKm: getDistanceKm(place, observation.position) }))
        .filter(({ distanceKm }) => distanceKm <= STATION_RADIUS_KM)

    return readings.sort(byDistanceThenNewest)[0] ?? null
}

// The models' median temperature at `at`, interpolated between the run's hourly steps; null outside the run.
export const getMedianAt = (run: TemperatureRun, at: Date) => {
    const median = getEnsembleStats(run).median
    const times = run.steps.map((step) => new Date(step).getTime())
    const next = times.findIndex((time) => time > at.getTime())

    if (next <= 0) return null

    const [before, after] = [median[next - 1], median[next]]

    if (before === null || after === null) return null

    const share = (at.getTime() - times[next - 1]) / (times[next] - times[next - 1])

    return before + (after - before) * share
}

// Only the models' change since the report is added to it: a model that runs warm or cold at this place does so at
// both times, so its bias cancels; without a run the reading is carried as it is.
export const getModelChange = (run: TemperatureRun | null, from: Date, to: Date) => {
    const [start, end] = run ? [getMedianAt(run, from), getMedianAt(run, to)] : [null, null]

    return start === null || end === null ? 0 : end - start
}

const getElevationCorrection = (stationM: number | null, cityM: number | undefined) =>
    stationM === null || cityM === undefined ? 0 : LAPSE_RATE_PER_M * (stationM - cityM)

const estimateFromStation = (
    { observation, distanceKm }: StationReading,
    city: City,
    change: number,
): CurrentResponse => ({
    temp: roundTenth(observation.temp + getElevationCorrection(observation.elevationM, city.elevationM) + change),
    source: 'station',
    observedAt: observation.observedAt.toISOString(),
    station: { id: observation.station, name: observation.name, distanceKm: roundTenth(distanceKm) },
})

const getStoredRun = async (city: City) => {
    const meta = await getLatestSnapshotMeta(city.id)

    return meta ? getLatestPayload(meta, Variable.Temp) : null
}

// A failed station lookup is not an error for the reader: the model answer stands in for it.
const getObservations = (city: City) =>
    fetchObservations(city, STATION_RADIUS_KM).catch((error) => {
        console.warn(`Station reports for ${city.slug} are unavailable: ${getErrorMessage(error)}`)

        return []
    })

const loadCurrent = async (city: City, now: Date): Promise<CurrentResponse> => {
    const reading = pickStationReading(await getObservations(city), city, now)

    if (!reading) {
        const model = await fetchModelTemperature(city)

        return { temp: roundTenth(model.temp), source: 'model', observedAt: model.time.toISOString() }
    }

    const run = await getStoredRun(city)

    return estimateFromStation(reading, city, getModelChange(run, reading.observation.observedAt, now))
}

export const getCurrentTemperature = (city: City, now: Date) =>
    cached(`current:${city.id}:${getQuarterHourEnd(now)}`, getCurrentMaxAge(now), () => loadCurrent(city, now))
