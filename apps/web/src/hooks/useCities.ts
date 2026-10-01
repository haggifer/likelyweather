import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/latest-query'
import { City, CityStatus } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useCities(status?: CityStatus): UseQueryResult<{ items: City[] }, Error> {
    return useQuery({
        queryKey: ['cities', status ?? 'all'],
        queryFn: () => apiGet<{ items: City[] }>('/cities', { status }),
        staleTime: 5 * MINUTE,
    })
}
