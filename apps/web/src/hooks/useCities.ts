import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/latest-query'
import { City } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useCities(): UseQueryResult<{ items: City[] }, Error> {
    return useQuery({
        queryKey: ['cities'],
        queryFn: () => apiGet<{ items: City[] }>('/cities'),
        staleTime: 5 * MINUTE,
    })
}
