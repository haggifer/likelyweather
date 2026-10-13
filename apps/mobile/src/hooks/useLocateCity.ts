import { Locale } from '@fa/shared/api'
import { LocateResult } from '@fa/shared/locate'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { locateCity } from '../lib/locate'

// User-triggered, so a mutation; a `PositionError` means the device could not say where the viewer is.
export function useLocateCity(): UseMutationResult<LocateResult, Error, Locale> {
    return useMutation({ mutationFn: locateCity })
}
