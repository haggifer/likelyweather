import { City } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'
import { MINUTE } from '../latest-query'

export function useCities(): UseQueryResult<{ items: City[] }, Error> {
    return useQuery({
        queryKey: ['cities'],
        queryFn: () => apiGet<{ items: City[] }>('/cities'),
        staleTime: 5 * MINUTE,
    })
}
