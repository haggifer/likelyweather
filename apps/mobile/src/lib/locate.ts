import { apiGet, apiPost } from '@fa/api-client/api'
import { GeocodeResponse, GeocodeResult, Locale, NearestResponse, TrackResponse } from '@fa/shared/api'
import { isQueryReady } from '@fa/shared/city-search'
import { Coordinates, getDistanceKm } from '@fa/shared/geo'
import { LocateResult, toLocateResult } from '@fa/shared/locate'
import { Place, toPlace } from '@fa/shared/places'
import { getPlaceName, getRoundedPosition } from './position'

// The device's geocoder names the town; the same name exists on several continents (Odessa, Paris), so only a
// namesake this close to the device can be the viewer's.
const NAMESAKE_MAX_KM = 100

const byDistanceTo = (position: Coordinates) => (a: GeocodeResult, b: GeocodeResult) =>
    getDistanceKm(position, a) - getDistanceKm(position, b)

// Beyond the nearest stored city's 50 km the device's geocoder names the place, and the app's own search finds and
// stores it, so a tap opens the viewer's town even when nobody opened it before. A failed search (no quota, rate
// limited) is not an error for the viewer: the nearest stored city is still an answer.
const findPlaceByName = async (name: string, locale: Locale, position: Coordinates): Promise<Place | null> => {
    try {
        const { results } = await apiGet<GeocodeResponse>('/geocode', { q: name, locale })
        const nearest = [...results].sort(byDistanceTo(position))[0]

        if (!nearest || getDistanceKm(position, nearest) > NAMESAKE_MAX_KM) return null

        const { slug } = await apiPost<TrackResponse>('/cities/track', { geocodeId: nearest.id })

        return toPlace({ ...nearest, slug })
    } catch (error) {
        console.warn(`Place lookup for "${name}" failed: ${String(error)}`)

        return null
    }
}

export const locateCity = async (locale: Locale): Promise<LocateResult> => {
    const position = await getRoundedPosition()
    const nearest = await apiGet<NearestResponse>('/cities/nearest', { lat: position.lat, lon: position.lon })
    const result = toLocateResult(nearest)

    if (result.kind === 'open') return result

    const name = await getPlaceName(position)
    const place = name && isQueryReady(name) ? await findPlaceByName(name, locale, position) : null

    return place ? { kind: 'open', place } : result
}
