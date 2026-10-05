import { QuotaResponse } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'
import { MINUTE } from '../latest-query'

// Refetched whenever a request that can spend quota settles (see `makeQueryClient`).
export function useQuota(): UseQueryResult<QuotaResponse, Error> {
    return useQuery({ queryKey: ['quota'], queryFn: () => apiGet<QuotaResponse>('/quota'), staleTime: 5 * MINUTE })
}
