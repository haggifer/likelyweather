import { apiGet } from '@fa/api-client/api'
import { StartersResponse } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

// The first visit's chips for the viewer's country; asked once, and a failure just keeps the default chips.
export function useStarters(enabled: boolean): UseQueryResult<StartersResponse, Error> {
    return useQuery({
        queryKey: ['starters'],
        queryFn: () => apiGet<StartersResponse>('/starters'),
        enabled,
        staleTime: Infinity,
        retry: false,
    })
}
