import { getLatestQuery } from '@/lib/query-keys'
import { LatestResponse } from '@fa/shared/api'
import { VARIABLES } from '@fa/shared/variables'
import { useQueries, UseQueryResult } from '@tanstack/react-query'

// Hourly series of every variable for the landing overview. The chart is anchored to the moment the data arrived,
// so it is never refetched in the background: only an explicit refresh re-anchors it. No placeholder data either,
// because switching cities must never show the previous one.
export function useHourlyAll(slug: string, enabled = true): UseQueryResult<LatestResponse, Error>[] {
    return useQueries({
        queries: VARIABLES.map((v) => ({
            ...getLatestQuery(slug, v.id),
            enabled: Boolean(slug) && enabled,
            staleTime: Infinity,
            refetchOnWindowFocus: false,
        })),
    })
}
