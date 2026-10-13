'use client'

import { OverviewCard, OverviewCardSkeleton } from '@/components/city/OverviewCard'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { Card, CardContent } from '@/components/ui/card'
import { useNow } from '@/hooks/useNow'
import { useOverviewPanels } from '@/hooks/useOverviewPanels'
import { getErrorKind } from '@fa/api-client/error-kind'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useHourlyAll } from '@fa/api-client/hooks/useHourlyAll'
import { OverviewHourly } from '@fa/chart-core/overview-stats'
import { LatestResponse } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { getPanelDataVariables, getVisiblePanels, PanelVariable } from '@fa/shared/overview-panels'
import { getChartStart } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES } from '@fa/shared/variables'
import { UseQueryResult } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { toast } from 'sonner'

const getHourlyByVariable = (results: UseQueryResult<LatestResponse, Error>[]) =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.flatMap((variable, i) => (results[i].data ? [[variable, results[i].data]] : [])),
    ) as OverviewHourly

// A panel is drawn once its series and its second line have arrived.
const getReadyPanels = (panels: PanelVariable[], hourly: OverviewHourly) =>
    panels.filter((panel) => getPanelDataVariables([panel]).every((variable) => hourly[variable]))

interface IProps {
    slug: string
}

export function CityOverview({ slug }: IProps) {
    const t = useTranslations('overview')
    const te = useTranslations('errors')
    const locale = useLocale()
    const now = useNow()
    const { panels } = useOverviewPanels()

    const visible = useMemo(() => getVisiblePanels(panels), [panels])

    const { data: city, error, refetch: refetchCity } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))

    // An error with data still in place is a failed Refresh: the chart stays and the handler reports the failure.
    const failed = results.find((r) => r.isError && !r.data)
    const hourly = getHourlyByVariable(results)
    const readyPanels = getReadyPanels(visible, hourly)
    const isEmpty = results.some((r) => r.data && !r.data.steps.length)
    const anchorRun = results.find((r) => r.data)?.data
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )

    const refetchAll = () => Promise.all(results.map((r) => r.refetch()))
    const handleRefresh = async () => {
        const refreshed = await refetchAll()
        const failure = refreshed.find((r) => r.isError)

        if (failure) toast.error(te(getErrorKind(failure.error)))
    }
    const handleRetry = () => (error ? void refetchCity() : void refetchAll())

    if (error || failed || isEmpty) {
        return (
            <Card data-bleed>
                <CardContent className="py-10">
                    {isEmpty ? (
                        <p className="text-center text-sm text-muted-foreground">{t('unavailable')}</p>
                    ) : (
                        <ErrorNotice error={error ?? failed?.error} onRetry={handleRetry} />
                    )}
                </CardContent>
            </Card>
        )
    }

    if (!city || !readyPanels.length || !anchor) {
        return (
            <OverviewCardSkeleton status={city ? t('fetching', { name: getCityName(city, locale) }) : t('loading')} />
        )
    }

    return (
        <OverviewCard
            city={city}
            panels={readyPanels}
            hourly={hourly}
            anchor={anchor}
            now={now}
            isFetching={results.some((r) => r.isFetching && r.data)}
            onRefresh={handleRefresh}
        />
    )
}
