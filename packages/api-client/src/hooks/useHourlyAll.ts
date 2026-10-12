import { LatestResponse } from '@fa/shared/api'
import { OverviewVariable } from '@fa/shared/variables'
import { useQueries, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery } from '../latest-query'

// Hourly series of the given overview variables, in that order: the ones the reader's panels draw, so a hidden panel
// costs no request. They are never refetched in the background, so a newer run never replaces the chart under the
// reader: only an explicit refresh does. No placeholder data either, because switching cities must never show the
// previous one.
export function useHourlyAll(
    slug: string,
    variables: readonly OverviewVariable[],
    enabled = true,
): UseQueryResult<LatestResponse, Error>[] {
    return useQueries({
        queries: variables.map((variable) => ({
            ...getLatestQuery(slug, variable),
            enabled: Boolean(slug) && enabled,
            staleTime: Infinity,
            refetchOnWindowFocus: false,
        })),
    })
}
