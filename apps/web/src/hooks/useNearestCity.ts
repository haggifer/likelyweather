import { apiGet } from '@/lib/api'
import { getRoundedPosition } from '@/lib/nearest'
import { NearestResponse } from '@fa/shared/api'
import { Coordinates } from '@fa/shared/geo'
import { useMutation, UseMutationResult } from '@tanstack/react-query'

export class PositionError extends Error {}

const toPositionError = (error: unknown) => new PositionError(error instanceof Error ? error.message : String(error))

const getPosition = () =>
    getRoundedPosition().catch((error) => {
        throw toPositionError(error)
    })

const fetchNearest = ({ lat, lon }: Coordinates) => apiGet<NearestResponse>('/cities/nearest', { lat, lon })

// User-triggered, so a mutation: asks the browser for the position, then the API for the nearest stored city. A
// `PositionError` means the browser could not say where the viewer is; anything else came from the API.
export function useNearestCity(): UseMutationResult<NearestResponse, Error, void> {
    return useMutation({ mutationFn: () => getPosition().then(fetchNearest) })
}
