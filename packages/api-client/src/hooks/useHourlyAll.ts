import { LatestResponse } from '@fa/shared/api'
import { OVERVIEW_VARIABLES } from '@fa/shared/variables'
import { useQueries, UseQueryResult } from '@tanstack/react-query'
import { getLatestQuery } from '../latest-query'

// A stable `combine` makes TanStack Query hand back the same array until a query changes, so callers can memoize on
// it instead of recomputing on every render.
const keepResults = (results: UseQueryResult<LatestResponse, Error>[]) => results

// Hourly series of every overview variable, in `OVERVIEW_VARIABLES` order, whichever panels the reader shows: they are
// asked for together, so all panels draw one run. Showing a hidden panel later would ask for its series alone, and
// with the stored run 3 hours old that request collects the city, spends a unit and draws that panel from a newer run
// than the rest. They are never refetched in the background, so a newer run never replaces the chart under the
// reader: only an explicit refresh does. No placeholder data either, because switching cities must never show the
// previous one.
export function useHourlyAll(slug: string, enabled = true): UseQueryResult<LatestResponse, Error>[] {
    return useQueries({
        queries: OVERVIEW_VARIABLES.map((variable) => ({
            ...getLatestQuery(slug, variable),
            enabled: Boolean(slug) && enabled,
            staleTime: Infinity,
            refetchOnWindowFocus: false,
        })),
        combine: keepResults,
    })
}
