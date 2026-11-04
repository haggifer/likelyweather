import { apiGet } from '@fa/api-client/api'
import { getCityQueryKey } from '@fa/api-client/hooks/useCity'
import { StartersResponse } from '@fa/shared/api'
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'

// A first visit's chips: the largest places of the viewer's country (CloudFront adds the country), asked once; a
// failure keeps the default chips. The answer carries each place's whole record, so the overview of the first one needs
// no request of its own for it.
export function useStarters(enabled: boolean): UseQueryResult<StartersResponse, Error> {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: ['starters'],
        queryFn: async () => {
            const starters = await apiGet<StartersResponse>('/starters')

            starters.items.forEach((city) => queryClient.setQueryData(getCityQueryKey(city.slug), city))

            return starters
        },
        enabled,
        staleTime: Infinity,
        retry: false,
    })
}
