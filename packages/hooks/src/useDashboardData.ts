import { useCity } from '@fa/api-client/hooks/useCity'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import { getLatestQuery } from '@fa/api-client/latest-query'
import { City, LatestResponse } from '@fa/shared/api'
import {
    DashboardStats,
    DashboardSummaryValues,
    getDashboardStats,
    getDashboardSummaryValues,
    getEnsembleStats,
    getShownLatest,
} from '@fa/shared/dashboard'
import { hasSeriesValues } from '@fa/shared/has-values'
import { ModelId } from '@fa/shared/models'
import { PairedRuns, toPairedRuns } from '@fa/shared/paired-values'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { getVariablePair, Variable, VARIABLE_BY_ID, VARIABLES } from '@fa/shared/variables'
import { useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

interface DashboardOptions {
    // The web's clock is null while it renders on the server and hydrates.
    now: Date | null
    locale: string
    // The web holds the queries back until it has read the variable from the URL.
    isEnabled?: boolean
    // The models the reader turned off; a stable list, since the statistics are memoized on it.
    hiddenModels?: ModelId[]
}

export interface UseDashboardDataResult {
    city: City | undefined
    latestQuery: UseQueryResult<LatestResponse, Error>
    precipQuery: UseQueryResult<LatestResponse, Error>
    // The local 3-hour slot the anchoring run was fetched in, where the chart starts.
    anchor: Date | null
    // The variable's run on the chart's slots, every model, for the legend.
    latest: LatestResponse | null
    // The same run without the hidden models: the chart's lines, the table's columns and every statistic.
    shown: LatestResponse | null
    // Whether the shown models have a value to draw; false when every model is hidden or none delivered the variable.
    hasData: boolean
    derived: DashboardStats | null
    // The summary sentence's values, apart from the variable's translated name.
    summary: DashboardSummaryValues | null
    // For a variable with a companion (feels-like, gusts), both runs, which phones show side by side.
    pairedRuns: PairedRuns | null
    retry: () => void
}

const NO_MODELS: ModelId[] = []

// A city dashboard's data in both apps: the chosen variable's run and the precipitation run, which anchors the chart
// because every variable shares it (a newer run re-anchors it), re-gridded onto the chart's slots, with its ensemble
// statistics and the summary's values. Once that run is on screen the city's other variables load in the background,
// so a switch draws from the cache instead of waiting for the network (author's lag report, 2026-10-14); the API serves
// them from the run it has just refreshed, so they spend no quota.
export function useDashboardData(
    slug: string,
    variable: Variable,
    { now, locale, isEnabled = true, hiddenModels = NO_MODELS }: DashboardOptions,
): UseDashboardDataResult {
    const queryClient = useQueryClient()

    const { data: city } = useCity(slug)
    const latestQuery = useLatest(slug, variable, isEnabled)
    const precipQuery = useLatest(slug, Variable.Precip, isEnabled)
    const companion = getVariablePair(variable)?.find((v) => v !== variable) ?? null
    const companionQuery = useLatest(slug, companion ?? variable, isEnabled && companion !== null)

    const timeZone = city?.timezone
    const aggregation = VARIABLE_BY_ID[variable].aggregation
    const anchorRun = precipQuery.data ?? latestQuery.data
    const isRunShown = latestQuery.isSuccess && precipQuery.isSuccess
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )
    const slots = useMemo(() => (anchor ? buildSlots(anchor, DASHBOARD_HOURS) : null), [anchor])
    const latest = useMemo(
        () => (latestQuery.data && slots ? toSlotLatest(latestQuery.data, slots, aggregation) : null),
        [latestQuery.data, slots, aggregation],
    )
    const shown = useMemo(() => (latest ? getShownLatest(latest, hiddenModels) : null), [latest, hiddenModels])
    const hasData = useMemo(() => (shown ? hasSeriesValues(shown.series) : false), [shown])
    const derived = useMemo(
        () => (shown && timeZone && now ? getDashboardStats(shown, variable, timeZone, now) : null),
        [shown, variable, timeZone, now],
    )
    const companionLatest = useMemo(
        () =>
            companion && companionQuery.data && slots
                ? toSlotLatest(companionQuery.data, slots, VARIABLE_BY_ID[companion].aggregation)
                : null,
        [companion, companionQuery.data, slots],
    )
    const pairedRuns = useMemo(
        () =>
            latest && derived && companionLatest
                ? toPairedRuns(
                      variable,
                      { series: latest.series, median: derived.stats.median },
                      {
                          series: companionLatest.series,
                          median: getEnsembleStats(getShownLatest(companionLatest, hiddenModels)).median,
                      },
                  )
                : null,
        [latest, derived, companionLatest, variable, hiddenModels],
    )
    const summary = useMemo(
        () => (shown && derived && now ? getDashboardSummaryValues(shown, derived, variable, now, locale) : null),
        [shown, derived, variable, now, locale],
    )

    const retry = () => {
        void latestQuery.refetch()
        void precipQuery.refetch()
    }

    useEffect(() => {
        if (!isRunShown) return

        // Only a variable missing from the cache is fetched; one already there waits for Refresh like the rest.
        VARIABLES.forEach(
            ({ id }) => void queryClient.prefetchQuery({ ...getLatestQuery(slug, id), staleTime: Infinity }),
        )
    }, [isRunShown, slug, queryClient])

    return { city, latestQuery, precipQuery, anchor, latest, shown, hasData, derived, summary, pairedRuns, retry }
}
