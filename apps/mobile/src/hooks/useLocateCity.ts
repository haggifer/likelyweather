import { Locale } from '@fa/shared/api'
import { LocateResult } from '@fa/shared/locate'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { locateCity } from '../lib/locate'

// User-triggered, so a mutation rather than a query.
export function useLocateCity(): UseMutationResult<LocateResult, Error, Locale> {
    return useMutation({ mutationFn: locateCity })
}
