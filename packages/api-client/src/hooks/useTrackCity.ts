import { GeocodeResult, TrackResponse } from '@fa/shared/api'
import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../api'
import { getCityQueryKey } from './useCity'

export const TRACK_MUTATION_KEY = ['track']

// It takes the whole result, so a page can show the place it is storing (`usePendingTrack`) before it has a slug,
// and it keeps the stored record, so the city's overview asks only for its forecast.
export function useTrackCity(): UseMutationResult<TrackResponse, Error, GeocodeResult> {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: TRACK_MUTATION_KEY,
        mutationFn: (result: GeocodeResult) => apiPost<TrackResponse>('/cities/track', { geocodeId: result.id }),
        onSuccess: ({ city }) => {
            if (city) queryClient.setQueryData(getCityQueryKey(city.slug), city)
        },
    })
}
