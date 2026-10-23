import { useCity } from '@fa/api-client/hooks/useCity'
import { useHourlyAll } from '@fa/api-client/hooks/useHourlyAll'
import { getHourlyByVariable, getReadyPanels, OverviewHourly } from '@fa/chart-core/overview-stats'
import { City, LatestResponse } from '@fa/shared/api'
import { PanelVariable } from '@fa/shared/overview-panels'
import { getChartStart } from '@fa/shared/slots'
import { UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'

export interface UseCityOverviewResult {
    city: City | undefined
    // One query per overview variable, in `OVERVIEW_VARIABLES` order.
    results: UseQueryResult<LatestResponse, Error>[]
    // The runs that have arrived, by variable, and the shown panels whose series and second line are among them.
    hourly: OverviewHourly
    readyPanels: PanelVariable[]
    // The local 3-hour slot the run was fetched in, where the chart starts.
    anchor: Date | null
    // The city's failure, or a run's that left nothing to draw.
    error: Error | null
    isEmpty: boolean
    // Offline, a query without stored data pauses instead of failing, and would spin until the network returns.
    isOffline: boolean
    isRefreshing: boolean
    // Fetches every run again and resolves to the first failure, if any.
    refresh: () => Promise<Error | null>
    retry: () => void
}

export function useCityOverview(slug: string, visible: PanelVariable[]): UseCityOverviewResult {
    const { data: city, error: cityError, refetch: refetchCity, fetchStatus: cityFetchStatus } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))

    // An error with data still in place is a failed Refresh: the chart stays and the caller reports the failure.
    const failed = results.find((r) => r.isError && !r.data)
    const hourly = useMemo(() => getHourlyByVariable(results), [results])
    const readyPanels = useMemo(() => getReadyPanels(visible, hourly), [visible, hourly])
    const anchorRun = results.find((r) => r.data)?.data
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )

    const refetchAll = () => Promise.all(results.map((r) => r.refetch()))
    const refresh = async () => {
        const refreshed = await refetchAll()

        return refreshed.find((r) => r.isError)?.error ?? null
    }
    const retry = () => (cityError ? void refetchCity() : void refetchAll())

    return {
        city,
        results,
        hourly,
        readyPanels,
        anchor,
        error: cityError ?? failed?.error ?? null,
        isEmpty: results.some((r) => r.data && !r.data.steps.length),
        isOffline:
            (!city && cityFetchStatus === 'paused') || results.some((r) => !r.data && r.fetchStatus === 'paused'),
        isRefreshing: results.some((r) => r.isFetching && r.data),
        refresh,
        retry,
    }
}
