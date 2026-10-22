import { Coordinates } from '@fa/shared/geo'
import { env } from '../env'
import { fetchWithRetry } from './fetch-with-retry'

export interface Observation {
    station: string
    name: string
    observedAt: Date
    temp: number
    position: Coordinates
    elevationM: number | null
}

interface RawMetar {
    icaoId: string
    name?: string
    obsTime: number
    temp?: number | null
    lat: number
    lon: number
    elev?: number | null
}

const KM_PER_DEGREE = 111.32

// Two hours back covers the 75-minute limit with a report to spare where stations report only hourly.
const HOURS_BACK = 2

const buildMetarUrl = ({ lat, lon }: Coordinates, radiusKm: number) => {
    const dLat = radiusKm / KM_PER_DEGREE
    const dLon = radiusKm / (KM_PER_DEGREE * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))
    const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(3)).join(',')
    const params = new URLSearchParams({ bbox, format: 'json', hours: String(HOURS_BACK) })

    return `${env.AVIATION_WEATHER_BASE}/api/data/metar?${params}`
}

const toObservation = (raw: RawMetar): Observation | null =>
    typeof raw.temp === 'number'
        ? {
              station: raw.icaoId,
              name: raw.name ?? raw.icaoId,
              observedAt: new Date(raw.obsTime * 1000),
              temp: raw.temp,
              position: { lat: raw.lat, lon: raw.lon },
              elevationM: raw.elev ?? null,
          }
        : null

// The airport reports (METAR) in a box around the place from the Aviation Weather Center's Data API, public US
// government data. A box with no station is answered with 204 and no body.
export const fetchObservations = async (position: Coordinates, radiusKm: number): Promise<Observation[]> => {
    const raws = await fetchWithRetry(
        buildMetarUrl(position, radiusKm),
        async (res): Promise<RawMetar[]> => (res.status === 204 ? [] : res.json()),
        { headers: { 'User-Agent': env.METNO_USER_AGENT } },
    )

    return raws.flatMap((raw) => toObservation(raw) ?? [])
}
