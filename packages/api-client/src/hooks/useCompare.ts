import { CompareResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'
import { MINUTE } from '../latest-query'

export function useCompare(slugs: string[], variable: Variable): UseQueryResult<CompareResponse, Error> {
    return useQuery({
        queryKey: ['compare', slugs.join(','), variable],
        queryFn: () => apiGet<CompareResponse>('/compare', { cities: slugs.join(','), variable }),
        enabled: slugs.length > 0,
        staleTime: 5 * MINUTE,
        placeholderData: keepPreviousData,
    })
}
