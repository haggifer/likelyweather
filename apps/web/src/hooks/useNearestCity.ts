import { getRoundedPosition } from '@/lib/nearest'
import { apiGet } from '@fa/api-client/api'
import { NearestResponse } from '@fa/shared/api'
import { Coordinates } from '@fa/shared/geo'
import { LocateResult, toLocateResult } from '@fa/shared/locate'
import { useMutation, UseMutationResult } from '@tanstack/react-query'

export class PositionError extends Error {}

const toPositionError = (error: unknown) => new PositionError(error instanceof Error ? error.message : String(error))

const getPosition = () =>
    getRoundedPosition().catch((error) => {
        throw toPositionError(error)
    })

const fetchNearest = ({ lat, lon }: Coordinates) => apiGet<NearestResponse>('/cities/nearest', { lat, lon })

// User-triggered, so a mutation. A `PositionError` means the browser could not say where the viewer is; anything else
// came from the API.
export function useNearestCity(): UseMutationResult<LocateResult, Error, void> {
    return useMutation({ mutationFn: () => getPosition().then(fetchNearest).then(toLocateResult) })
}
