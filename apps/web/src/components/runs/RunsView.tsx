'use client'

import RunsTable from '@/components/runs/RunsTable'
import RunsTimeline from '@/components/runs/RunsTimeline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCities, useRuns, useTimeline } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import { getCityName } from '@fa/shared/format'
import { useLocale, useTranslations } from 'next-intl'

export default function RunsView() {
    const t = useTranslations('runs')
    const locale = useLocale()
    const now = useNow()
    const { data: runs } = useRuns()
    const { data: timeline } = useTimeline(30)
    const { data: cities } = useCities()
    const cityNames = new Map(cities?.items.map((c) => [c.id, getCityName(c, locale)]))

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-semibold">{t('timelineTitle')}</CardTitle>
                    <CardDescription>{t('timelineDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {timeline && now ? <RunsTimeline timeline={timeline} now={now} /> : <Skeleton className="h-24" />}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-semibold">{t('tableTitle')}</CardTitle>
                    <CardDescription>{t('tableDescription', { count: runs?.items.length ?? 0 })}</CardDescription>
                </CardHeader>
                <CardContent>
                    {runs ? <RunsTable runs={runs.items} cityNames={cityNames} /> : <Skeleton className="h-64" />}
                </CardContent>
            </Card>
        </div>
    )
}
