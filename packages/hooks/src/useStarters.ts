import { apiGet } from '@fa/api-client/api'
import { StartersResponse } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

// A first visit's chips: the largest places of the viewer's country (CloudFront adds the country), asked once; a
// failure keeps the default chips.
export function useStarters(enabled: boolean): UseQueryResult<StartersResponse, Error> {
    return useQuery({
        queryKey: ['starters'],
        queryFn: () => apiGet<StartersResponse>('/starters'),
        enabled,
        staleTime: Infinity,
        retry: false,
    })
}
