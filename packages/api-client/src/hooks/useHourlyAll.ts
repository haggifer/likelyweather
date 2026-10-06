import { LatestResponse } from '@fa/shared/api'
import { VARIABLES } from '@fa/shared/variables'
import { useQueries, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery } from '../latest-query'

// Hourly series of every variable for the landing overview. It is never refetched in the background, so a newer run
// never replaces the chart under the reader: only an explicit refresh does. No placeholder data either,
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
