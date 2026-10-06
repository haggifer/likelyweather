import { apiGet, apiPost } from '@fa/api-client/api'
import { City, GeocodeResponse, GeocodeResult, Locale, NearestResponse, TrackResponse } from '@fa/shared/api'
import { isNearEnough } from '@fa/shared/geo'
import { Place, toPlace } from '@fa/shared/places'
import { getPlaceName, getRoundedPosition } from './position'

export type LocateResult = { kind: 'open'; place: Place } | { kind: 'far'; city: City; distanceKm: number }

const byPopulation = (a: GeocodeResult, b: GeocodeResult) => (b.population ?? 0) - (a.population ?? 0)

// Beyond the nearest stored city's 50 km the device's geocoder names the place, and the app's own search finds and
// stores it, so a tap opens the viewer's town even when nobody opened it before.
const findPlaceByName = async (name: string, locale: Locale): Promise<Place | null> => {
    const { results } = await apiGet<GeocodeResponse>('/geocode', { q: name, locale })
    const best = [...results].sort(byPopulation)[0]

    if (!best) return null

    const { slug } = await apiPost<TrackResponse>('/cities/track', { geocodeId: best.id })

    return toPlace({ ...best, slug })
}

export const locateCity = async (locale: Locale): Promise<LocateResult> => {
    const position = await getRoundedPosition()
    const { city, distanceKm } = await apiGet<NearestResponse>('/cities/nearest', {
        lat: position.lat,
        lon: position.lon,
    })

    if (isNearEnough(distanceKm)) return { kind: 'open', place: toPlace(city) }

    const name = await getPlaceName(position)
    const place = name && name.length >= 3 ? await findPlaceByName(name, locale) : null

    return place ? { kind: 'open', place } : { kind: 'far', city, distanceKm }
}
