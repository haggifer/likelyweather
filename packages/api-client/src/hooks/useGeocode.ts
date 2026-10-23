import { GeocodeResponse, Locale } from '@fa/shared/api'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'
import { MINUTE } from '../latest-query'

export function useGeocode(q: string, locale: Locale): UseQueryResult<GeocodeResponse, Error> {
    return useQuery({
        queryKey: ['geocode', locale, q.toLowerCase()],
        queryFn: () => apiGet<GeocodeResponse>('/geocode', { q, locale }),
        enabled: q.trim().length >= 3,
        staleTime: 60 * MINUTE,
        placeholderData: keepPreviousData,
        // The API spends the unit before it asks Open-Meteo, so a retry after a failed search would charge it twice.
        retry: false,
    })
}
