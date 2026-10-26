import { City, NearestResponse } from './api'
import { getCityName } from './format'
import { formatDistanceKm, isNearEnough } from './geo'
import { Place, toPlace } from './places'

export type LocateResult = { kind: 'open'; place: Place } | { kind: 'far'; city: City; distanceKm: number }

export const toLocateResult = ({ city, distanceKm }: NearestResponse): LocateResult =>
    isNearEnough(distanceKm) ? { kind: 'open', place: toPlace(city) } : { kind: 'far', city, distanceKm }

// The `search.locateFar` message's values: the city in the reader's language, the distance in whole kilometres.
export const getLocateFarValues = (city: City, distanceKm: number, locale: string) => ({
    name: getCityName(city, locale),
    km: formatDistanceKm(distanceKm, locale),
})
