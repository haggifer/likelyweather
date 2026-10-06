import { NEAREST_MAX_KM } from './constants'

export interface Coordinates {
    lat: number
    lon: number
}

const EARTH_RADIUS_KM = 6371
// Two decimals are about 1 km: enough to find the nearest city, coarse enough to share CDN cache entries and to
// keep an exact position out of the request.
const COORDINATE_DECIMALS = 2

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const haversine = (angle: number) => Math.sin(angle / 2) ** 2

// Great-circle distance on a spherical Earth; within 0.5 % of the geodesic, which is plenty for "which city is nearest".
export const getDistanceKm = (a: Coordinates, b: Coordinates) => {
    const dLat = toRadians(b.lat - a.lat)
    const dLon = toRadians(b.lon - a.lon)
    const h = haversine(dLat) + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * haversine(dLon)

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const roundCoordinate = (value: number) => Number(value.toFixed(COORDINATE_DECIMALS))

export const roundCoordinates = ({ lat, lon }: Coordinates): Coordinates => ({
    lat: roundCoordinate(lat),
    lon: roundCoordinate(lon),
})

// "Use my location" opens the nearest stored city only this close; farther away it names the city and the distance.
export const isNearEnough = (distanceKm: number) => distanceKm <= NEAREST_MAX_KM

export const formatDistanceKm = (distanceKm: number, locale: string) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(distanceKm)
