import { apiGet } from '@/lib/api'
import { isNotFound } from '@/lib/error-kind'
import { MINUTE } from '@/lib/latest-query'
import { City } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useCity(slug: string): UseQueryResult<City, Error> {
    return useQuery({
        queryKey: ['city', slug],
        queryFn: () => apiGet<City>(`/cities/${slug}`),
        staleTime: 5 * MINUTE,
        retry: (count, error) => count < 2 && !isNotFound(error),
    })
}
