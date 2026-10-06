import { MutationCache, QueryCache, QueryClient, QueryKey } from '@tanstack/react-query'

// Requests that can make the server call the weather services, and so spend the daily quota.
const QUOTA_SPENDING = new Set(['latest', 'compare', 'geocode'])

export const makeQueryClient = () => {
    // One page settles several quota-spending queries at once; they share the quota request already in flight.
    const refreshQuota = () => void client.invalidateQueries({ queryKey: ['quota'] }, { cancelRefetch: false })
    const client: QueryClient = new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
        queryCache: new QueryCache({
            onSettled: (_data, _error, query: { queryKey: QueryKey }) => {
                if (QUOTA_SPENDING.has(String(query.queryKey[0]))) refreshQuota()
            },
        }),
        mutationCache: new MutationCache({ onSettled: refreshQuota }),
    })

    return client
}
