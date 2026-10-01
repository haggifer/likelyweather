import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/query-keys'
import { CityDetail } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useCity(slug: string): UseQueryResult<CityDetail, Error> {
    return useQuery({
        queryKey: ['city', slug],
        queryFn: () => apiGet<CityDetail>(`/cities/${slug}`),
        staleTime: 5 * MINUTE,
        retry: (count, error) => count < 2 && !error.message.includes('No tracked city'),
    })
}
