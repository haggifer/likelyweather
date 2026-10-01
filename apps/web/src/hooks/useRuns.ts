import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/query-keys'
import { RunsResponse } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useRuns(): UseQueryResult<RunsResponse, Error> {
    return useQuery({
        queryKey: ['runs'],
        queryFn: () => apiGet<RunsResponse>('/runs', { limit: 500 }),
        staleTime: MINUTE,
    })
}
