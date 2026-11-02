import { LatestResponse } from '@fa/shared/api'
import { getMsUntilRefreshDue } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { Query, useQuery, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery } from '../latest-query'
import { keepSameVariable } from '../placeholder'

const getRunStaleTime = (query: Query<LatestResponse, Error>) =>
    query.state.data ? getMsUntilRefreshDue(query.state.data.fetchedAt, new Date()) : 0

// The cache is shared with the landing overview. It has no refetch timer of its own: a refetch of a run that is 3 hours
// old makes the API collect the city and spends the viewer's quota, so only Refresh asks again (pressed, or by itself
// the moment it is offered while the page is in front: `useAutoRefresh`), and a remount once it is offered. Until then a
// remount reads the cache: the API would answer with the same run.
export function useLatest(slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> {
    return useQuery({
        ...getLatestQuery(slug, variable),
        enabled: Boolean(slug) && enabled,
        staleTime: getRunStaleTime,
        placeholderData: keepSameVariable<LatestResponse>(variable),
    })
}
