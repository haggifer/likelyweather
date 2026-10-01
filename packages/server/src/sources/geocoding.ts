import { GeocodeResult, Locale } from '@fa/shared/api'
import { cached } from '../cache'
import { env } from '../env'
import { fetchJson } from './fetch-with-retry'

interface RawGeocode {
    id: number
    name: string
    latitude: number
    longitude: number
    elevation?: number
    country_code?: string
    country?: string
    admin1?: string
    timezone?: string
    population?: number
}

const GEOCODE_TTL_SECONDS = 24 * 3600

const toResult = (raw: RawGeocode): GeocodeResult | null => {
    if (!raw.country_code || !raw.timezone) return null

    return {
        id: raw.id,
        name: raw.name,
        admin1: raw.admin1,
        country: raw.country ?? raw.country_code,
        countryCode: raw.country_code,
        lat: raw.latitude,
        lon: raw.longitude,
        elevationM: raw.elevation,
        timezone: raw.timezone,
        population: raw.population,
    }
}

// `onUpstream` runs only when the cache cannot answer, right before the request goes out.
export const searchPlaces = (q: string, locale: Locale, onUpstream: () => Promise<void> = async () => {}) =>
    cached(`geocode:${locale}:${q.toLowerCase()}`, GEOCODE_TTL_SECONDS, async () => {
        await onUpstream()
        const params = new URLSearchParams({ name: q, count: '10', language: locale, format: 'json' })
        const body = await fetchJson<{ results?: RawGeocode[] }>(`${env.OPEN_METEO_GEOCODING_BASE}/v1/search?${params}`)

        return (body.results ?? []).map(toResult).filter((r): r is GeocodeResult => r !== null)
    })

export const getPlace = (id: number, locale: Locale) =>
    cached(`geocode:id:${locale}:${id}`, GEOCODE_TTL_SECONDS, async () => {
        const params = new URLSearchParams({ id: String(id), language: locale })
        const body = await fetchJson<RawGeocode>(`${env.OPEN_METEO_GEOCODING_BASE}/v1/get?${params}`)

        return toResult(body)
    })
