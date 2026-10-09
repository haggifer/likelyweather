import { LatestResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery, MINUTE } from '../latest-query'

// The hourly grid of one variable, shared with the landing overview's cache. It is never refetched on a timer: a
// refetch of a run that is 3 hours old makes the API collect the city and spends the viewer's quota, so only Refresh
// (and a remount after staleTime) asks again.
export function useLatest(slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> {
    return useQuery({
        ...getLatestQuery(slug, variable),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * MINUTE,
        placeholderData: keepPreviousData,
    })
}
