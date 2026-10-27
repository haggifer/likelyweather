import { GeocodeResult } from '@fa/shared/api'
import { useMutationState } from '@tanstack/react-query'
import { TRACK_MUTATION_KEY } from './useTrackCity'

// The place a search box is storing right now: the page shows it as picked while the server makes its slug.
export function usePendingTrack(): GeocodeResult | null {
    const pending = useMutationState({
        filters: { mutationKey: TRACK_MUTATION_KEY, status: 'pending' },
        select: (mutation) => mutation.state.variables as GeocodeResult,
    })

    return pending.at(-1) ?? null
}
