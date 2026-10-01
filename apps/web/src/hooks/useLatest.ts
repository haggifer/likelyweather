import { getLatestQuery, LATEST_REFETCH_MS, MINUTE } from '@/lib/query-keys'
import { LatestResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'

// The hourly grid of one variable, shared with the landing overview's cache; the dashboard builds its local 3-hour
// slots from it and re-anchors them whenever this refetches.
export function useLatest(slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> {
    return useQuery({
        ...getLatestQuery(slug, variable),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * MINUTE,
        refetchInterval: LATEST_REFETCH_MS,
        placeholderData: keepPreviousData,
    })
}
