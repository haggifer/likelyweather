import { getErrorKind } from '@fa/api-client/error-kind'
import { useCityOverview } from '@fa/hooks/useCityOverview'
import { getCityName } from '@fa/shared/format'
import { getVisiblePanels } from '@fa/shared/overview-panels'
import { useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useNow } from '../../hooks/useNow'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { cn } from '../../lib/cn'
import { showSnackbar } from '../../lib/snackbar-store'
import { updateWidgetsForCity } from '../../widget/widget-updates'
import { Card, CardContent } from '../ui/card'
import { BLEED_CARD } from '../ui/EdgeSheet'
import { ErrorNotice } from '../ui/ErrorNotice'
import { Text } from '../ui/text'
import { OverviewCard, OverviewCardSkeleton } from './OverviewCard'

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

    const { city, results, hourly, readyPanels, anchor, error, isEmpty, isOffline, isRefreshing, refresh, retry } =
        useCityOverview(slug, visible)

    const isReady = results.every((r) => r.data)
    // Refresh settles the variables one by one; the widgets must get them as one run, so the effect waits until
    // nothing is fetching and follows every fetch time rather than `hourly`, whose identity changes every render.
    const isSettled = !results.some((r) => r.isFetching)
    const fetchedAts = results.map((r) => r.data?.fetchedAt).join('|')

    const handleRefresh = async () => {
        const failure = await refresh()

        if (failure) showSnackbar(te(getErrorKind(failure)))
    }

    // A home-screen widget showing this city redraws with the run the app just loaded.
    useEffect(() => {
        if (city && isReady && isSettled) void updateWidgetsForCity(city, hourly)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [city, fetchedAts, isSettled])

    if (error || isEmpty || isOffline) {
        return (
            <Card className={cn('py-4', BLEED_CARD)}>
                <CardContent>
                    {isEmpty || isOffline ? (
                        <Text
                            className="py-10 text-center text-sm text-muted-foreground"
                            accessibilityLiveRegion="polite"
                        >
                            {isOffline ? te('offline') : t('unavailable')}
                        </Text>
                    ) : (
                        <ErrorNotice error={error} onRetry={retry} />
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
            isFetching={isRefreshing}
            onRefresh={handleRefresh}
        />
    )
}
