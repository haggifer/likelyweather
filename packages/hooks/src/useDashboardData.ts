import { useCity } from '@fa/api-client/hooks/useCity'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import { City, LatestResponse } from '@fa/shared/api'
import {
    DashboardStats,
    DashboardSummaryValues,
    getDashboardStats,
    getDashboardSummaryValues,
} from '@fa/shared/dashboard'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'

interface DashboardOptions {
    // The web's clock is null while it renders on the server and hydrates.
    now: Date | null
    locale: string
    // The web holds the queries back until it has read the variable from the URL.
    isEnabled?: boolean
}

export interface UseDashboardDataResult {
    city: City | undefined
    latestQuery: UseQueryResult<LatestResponse, Error>
    precipQuery: UseQueryResult<LatestResponse, Error>
    // The local 3-hour slot the anchoring run was fetched in, where the chart starts.
    anchor: Date | null
    // The variable's run on the chart's slots.
    latest: LatestResponse | null
    derived: DashboardStats | null
    // The summary sentence's values, apart from the variable's translated name.
    summary: DashboardSummaryValues | null
    retry: () => void
}

// A city dashboard's data in both apps: the chosen variable's run and the precipitation run, which anchors the chart
// because every variable shares it (a newer run re-anchors it), re-gridded onto the chart's slots, with its ensemble
// statistics and the summary's values.
export function useDashboardData(
    slug: string,
    variable: Variable,
    { now, locale, isEnabled = true }: DashboardOptions,
): UseDashboardDataResult {
    const { data: city } = useCity(slug)
    const latestQuery = useLatest(slug, variable, isEnabled)
    const precipQuery = useLatest(slug, Variable.Precip, isEnabled)

    const timeZone = city?.timezone
    const aggregation = VARIABLE_BY_ID[variable].aggregation
    const anchorRun = precipQuery.data ?? latestQuery.data
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )
    const slots = useMemo(() => (anchor ? buildSlots(anchor, DASHBOARD_HOURS) : null), [anchor])
    const latest = useMemo(
        () => (latestQuery.data && slots ? toSlotLatest(latestQuery.data, slots, aggregation) : null),
        [latestQuery.data, slots, aggregation],
    )
    const derived = useMemo(
        () => (latest && timeZone && now ? getDashboardStats(latest, variable, timeZone, now) : null),
        [latest, variable, timeZone, now],
    )
    const summary = useMemo(
        () => (latest && derived && now ? getDashboardSummaryValues(latest, derived, variable, now, locale) : null),
        [latest, derived, variable, now, locale],
    )

    const retry = () => {
        void latestQuery.refetch()
        void precipQuery.refetch()
    }

    return { city, latestQuery, precipQuery, anchor, latest, derived, summary, retry }
}
