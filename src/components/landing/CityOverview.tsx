'use client'

import { MedianOverviewSkeleton } from '@/charts/MedianOverview'
import OverviewCard from '@/components/city/OverviewCard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useCity, useHourlyAll } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import { getCityName } from '@/lib/format'
import { LatestResponse } from '@/shared/api'
import { getSlotStart } from '@/shared/slots'
import { Variable, VARIABLES } from '@/shared/variables'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface IProps {
    slug: string
}

export default function CityOverview({ slug }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const now = useNow()
    const { data: city, error } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))
    const failed = results.find((r) => r.isError)
    const isReady = results.every((r) => r.data)
    const isEmpty = results.some((r) => r.data && !r.data.steps.length)
    const receivedAt = Math.max(...results.map((r) => r.dataUpdatedAt))
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && receivedAt ? getSlotStart(new Date(receivedAt), timeZone) : null),
        [receivedAt, timeZone],
    )

    const handleRefresh = () => results.forEach((r) => void r.refetch())

    if (error || failed || isEmpty) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {isEmpty ? t('unavailable') : t('failed', { message: (error ?? failed?.error)?.message ?? '' })}
                </CardContent>
            </Card>
        )
    }

    if (!city || !isReady || !anchor) {
        return (
            <Card className="gap-4">
                <CardHeader>
                    <p className="flex h-7 items-center gap-2 text-sm text-muted-foreground" role="status">
                        <Loader2 className="size-4 animate-spin" />
                        {city ? t('fetching', { name: getCityName(city, locale) }) : t('loading')}
                    </p>
                </CardHeader>
                <CardContent>
                    <MedianOverviewSkeleton />
                </CardContent>
            </Card>
        )
    }

    const hourly = Object.fromEntries(VARIABLES.map((v, i) => [v.id, results[i].data])) as Record<
        Variable,
        LatestResponse
    >

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
