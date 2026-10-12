import { getErrorKind } from '@fa/api-client/error-kind'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useHourlyAll } from '@fa/api-client/hooks/useHourlyAll'
import { OverviewHourly } from '@fa/chart-core/overview-stats'
import { LatestResponse } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { getChartStart } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES } from '@fa/shared/variables'
import { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useNow } from '../../hooks/useNow'
import { useTheme } from '../../hooks/useTheme'
import { showSnackbar } from '../../lib/snackbar-store'
import { updateWidgetsForCity } from '../../widget/widget-updates'
import { Card } from '../ui/Card'
import { ErrorNotice } from '../ui/ErrorNotice'
import { Text } from '../ui/Text'
import { OverviewCard, OverviewCardSkeleton } from './OverviewCard'

const styles = StyleSheet.create({
    notice: { fontSize: 14, lineHeight: 21, textAlign: 'center', paddingVertical: 40 },
})

const getHourlyByVariable = (results: UseQueryResult<LatestResponse, Error>[]) =>
    Object.fromEntries(OVERVIEW_VARIABLES.map((variable, i) => [variable, results[i].data])) as OverviewHourly

interface IProps {
    slug: string
}

export function CityOverview({ slug }: IProps) {
    const t = useTranslations('overview')
    const te = useTranslations('errors')
    const locale = useLocale()
    const now = useNow()
    const { colors } = useTheme()

    const { data: city, error, refetch: refetchCity, fetchStatus: cityFetchStatus } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))

    // An error with data still in place is a failed Refresh: the chart stays and the handler reports the failure.
    const failed = results.find((r) => r.isError && !r.data)
    const isReady = results.every((r) => r.data)
    const isEmpty = results.some((r) => r.data && !r.data.steps.length)
    // Offline, a query without stored data pauses instead of failing, and would spin until the network returns.
    const isOffline =
        (!city && cityFetchStatus === 'paused') || results.some((r) => !r.data && r.fetchStatus === 'paused')
    const anchorRun = results[0].data
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )
    const hourly = isReady ? getHourlyByVariable(results) : null
    // Refresh settles the six variables one by one; the widgets must get them as one run, so the effect waits until
    // nothing is fetching and follows every fetch time rather than `hourly`, whose identity changes every render.
    const isSettled = !results.some((r) => r.isFetching)
    const fetchedAts = results.map((r) => r.data?.fetchedAt).join('|')

    const refetchAll = () => Promise.all(results.map((r) => r.refetch()))
    const handleRefresh = async () => {
        const refreshed = await refetchAll()
        const failure = refreshed.find((r) => r.isError)

        if (failure) showSnackbar(te(getErrorKind(failure.error)))
    }
    const handleRetry = () => (error ? void refetchCity() : void refetchAll())

    // A home-screen widget showing this city redraws with the run the app just loaded.
    useEffect(() => {
        if (city && hourly && isSettled) void updateWidgetsForCity(city, hourly)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [city, fetchedAts, isSettled])

    if (error || failed || isEmpty || isOffline) {
        return (
            <Card>
                {isEmpty || isOffline ? (
                    <Text
                        style={[styles.notice, { color: colors['muted-foreground'] }]}
                        accessibilityLiveRegion="polite"
                    >
                        {isOffline ? te('offline') : t('unavailable')}
                    </Text>
                ) : (
                    <ErrorNotice error={error ?? failed?.error} onRetry={handleRetry} />
                )}
            </Card>
        )
    }

    if (!city || !hourly || !anchor) {
        return (
            <OverviewCardSkeleton status={city ? t('fetching', { name: getCityName(city, locale) }) : t('loading')} />
        )
    }

    return (
        <OverviewCard
            city={city}
            hourly={hourly}
            anchor={anchor}
            now={now}
            isFetching={results.some((r) => r.isFetching)}
            onRefresh={handleRefresh}
        />
    )
}
