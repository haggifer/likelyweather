'use client'

import { OverviewCard, OverviewCardSkeleton } from '@/components/city/OverviewCard'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { Card, CardContent } from '@/components/ui/card'
import { useNow } from '@/hooks/useNow'
import { useOverviewPanels } from '@/hooks/useOverviewPanels'
import { getErrorKind } from '@fa/api-client/error-kind'
import { useCityOverview } from '@fa/hooks/useCityOverview'
import { getCityName } from '@fa/shared/format'
import { getVisiblePanels } from '@fa/shared/overview-panels'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { toast } from 'sonner'

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

    const { city, hourly, readyPanels, anchor, error, isEmpty, isRefreshing, refresh, retry } = useCityOverview(
        slug,
        visible,
    )

    const handleRefresh = async () => {
        const failure = await refresh()

        if (failure) toast.error(te(getErrorKind(failure)))
    }

    if (error || isEmpty) {
        return (
            <Card data-bleed>
                <CardContent className="py-10">
                    {isEmpty ? (
                        <p className="text-center text-sm text-muted-foreground">{t('unavailable')}</p>
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
