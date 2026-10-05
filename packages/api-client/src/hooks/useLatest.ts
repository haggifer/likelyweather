import { LatestResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery, LATEST_REFETCH_MS, MINUTE } from '../latest-query'

// The hourly grid of one variable, shared with the landing overview's cache; the dashboard builds its local 3-hour
// slots from the slot the run was fetched in, so a refetch moves them only when it brings a newer run.
export function useLatest(slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> {
    return useQuery({
        ...getLatestQuery(slug, variable),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * MINUTE,
        refetchInterval: LATEST_REFETCH_MS,
        placeholderData: keepPreviousData,
    })
}
