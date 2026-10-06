import { TrackResponse } from '@fa/shared/api'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { apiPost } from '../api'

export function useTrackCity(): UseMutationResult<TrackResponse, Error, number> {
    return useMutation({ mutationFn: (geocodeId: number) => apiPost<TrackResponse>('/cities/track', { geocodeId }) })
}
