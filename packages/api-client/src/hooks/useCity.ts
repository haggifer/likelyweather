import { City } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet, isNotFound } from '../api'

export const getCityQueryKey = (slug: string) => ['city', slug]

// A city's record never changes once it is tracked, so it is asked for once per cache.
export function useCity(slug: string): UseQueryResult<City, Error> {
    return useQuery({
        queryKey: getCityQueryKey(slug),
        queryFn: () => apiGet<City>(`/cities/${encodeURIComponent(slug)}`),
        staleTime: Infinity,
        retry: (count, error) => count < 2 && !isNotFound(error),
    })
}
