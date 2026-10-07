import { getErrorKind } from '@fa/api-client/error-kind'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useHourlyAll } from '@fa/api-client/hooks/useHourlyAll'
import { LatestResponse } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { getChartStart } from '@fa/shared/slots'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useNow } from '../../hooks/useNow'
import { useTheme } from '../../hooks/useTheme'
import { updateWidgetsForCity } from '../../widget/widget-updates'
import { Card } from '../ui/Card'
import { ErrorNotice } from '../ui/ErrorNotice'
import { Skeleton } from '../ui/Skeleton'
import { OverviewCard } from './OverviewCard'

const styles = StyleSheet.create({
    status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 14 },
})

const getHourlyByVariable = (results: UseQueryResult<LatestResponse, Error>[]) =>
    Object.fromEntries(VARIABLES.map((v, i) => [v.id, results[i].data])) as Record<Variable, LatestResponse>

interface IProps {
    slug: string
}

export function CityOverview({ slug }: IProps) {
    const t = useTranslations('overview')
    const te = useTranslations('errors')
    const locale = useLocale()
    const now = useNow()
    const { colors } = useTheme()

    const { data: city, error, refetch: refetchCity } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))

    // An error with data still in place is a failed Refresh: the chart stays and the handler reports the failure.
    const failed = results.find((r) => r.isError && !r.data)
    const isReady = results.every((r) => r.data)
    const isEmpty = results.some((r) => r.data && !r.data.steps.length)
    const anchorRun = results[0].data
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
    )
    const hourly = isReady ? getHourlyByVariable(results) : null
    // Refresh settles the four variables one by one; the widgets must get them as one run, so the effect waits until
    // nothing is fetching and follows every fetch time rather than `hourly`, whose identity changes every render.
    const isSettled = !results.some((r) => r.isFetching)
    const fetchedAts = results.map((r) => r.data?.fetchedAt).join('|')

    const refetchAll = () => Promise.all(results.map((r) => r.refetch()))
    const handleRefresh = async () => {
        const refreshed = await refetchAll()
        const failure = refreshed.find((r) => r.isError)

        if (failure) Alert.alert(te(getErrorKind(failure.error)))
    }
    const handleRetry = () => (error ? void refetchCity() : void refetchAll())

    // A home-screen widget showing this city redraws with the run the app just loaded.
    useEffect(() => {
        if (city && hourly && isSettled) void updateWidgetsForCity(city, hourly)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [city, fetchedAts, isSettled])

    if (error || failed || isEmpty) {
        return (
            <Card>
                {isEmpty ? (
                    <Text style={[styles.text, { color: colors['muted-foreground'] }]}>{t('unavailable')}</Text>
                ) : (
                    <ErrorNotice error={error ?? failed?.error} onRetry={handleRetry} />
                )}
            </Card>
        )
    }

    if (!city || !hourly || !anchor) {
        return (
            <Card>
                <View style={styles.status} accessibilityRole="progressbar">
                    <ActivityIndicator size="small" color={colors['muted-foreground']} />
                    <Text style={[styles.text, { color: colors['muted-foreground'] }]}>
                        {city ? t('fetching', { name: getCityName(city, locale) }) : t('loading')}
                    </Text>
                </View>
                <Skeleton height={72} />
                <Skeleton height={420} />
            </Card>
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
