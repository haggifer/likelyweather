'use client'

import { OverviewCard, OverviewCardSkeleton } from '@/components/city/OverviewCard'
import { useCity } from '@/hooks/useCity'
import { useHourlyAll } from '@/hooks/useHourlyAll'
import { LatestResponse } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { getChartStart } from '@fa/shared/slots'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { Card, CardContent } from '@fa/ui/components/card'
import { useNow } from '@fa/ui/hooks/useNow'
import { UseQueryResult } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface IProps {
    slug: string
}

const getHourlyByVariable = (results: UseQueryResult<LatestResponse, Error>[]) =>
    Object.fromEntries(VARIABLES.map((v, i) => [v.id, results[i].data])) as Record<Variable, LatestResponse>

export function CityOverview({ slug }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const now = useNow()

    const { data: city, error } = useCity(slug)
    const results = useHourlyAll(slug, Boolean(city))

    const failed = results.find((r) => r.isError)
    const isReady = results.every((r) => r.data)
    const isEmpty = results.some((r) => r.data && !r.data.steps.length)
    const anchorRun = results[0].data
    const timeZone = city?.timezone
    const anchor = useMemo(
        () => (timeZone && anchorRun ? getChartStart(anchorRun, timeZone) : null),
        [anchorRun, timeZone],
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
            <OverviewCardSkeleton status={city ? t('fetching', { name: getCityName(city, locale) }) : t('loading')} />
        )
    }

    const hourly = getHourlyByVariable(results)

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
