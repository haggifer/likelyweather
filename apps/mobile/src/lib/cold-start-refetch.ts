import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { LatestResponse } from '@fa/shared/api'
import { Query } from '@tanstack/react-query'

type QueryLike = Pick<Query, 'queryKey' | 'state'>

const getFetchedAt = (query: QueryLike) =>
    query.queryKey[0] === 'latest' ? (query.state.data as LatestResponse | undefined)?.fetchedAt : undefined

// A cold start restores forecasts up to a day old, and the Home overview never refetches on its own. A run restored
// from the last session that is now due for a refresh is asked again when it is first shown, as if the viewer had
// pressed Refresh; a run fetched in this session keeps the web's rule (only Refresh). Every other query keeps
// TanStack's default: refetch on mount when stale.
export const getColdStartRefetch =
    (startedAt: number, getNow = () => new Date()) =>
    (query: QueryLike): boolean | 'always' => {
        const isRestored = query.state.dataUpdatedAt > 0 && query.state.dataUpdatedAt < startedAt

        return isRestored && isRefreshOffered(getFetchedAt(query), getNow()) ? 'always' : true
    }
