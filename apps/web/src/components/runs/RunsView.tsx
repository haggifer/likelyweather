'use client'

import { RunsCards } from '@/components/runs/RunsCards'
import { RunsTable } from '@/components/runs/RunsTable'
import { RunsTimeline } from '@/components/runs/RunsTimeline'
import { useCities } from '@/hooks/useCities'
import { useRuns } from '@/hooks/useRuns'
import { useTimeline } from '@/hooks/useTimeline'
import { getCityName } from '@fa/shared/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fa/ui/components/card'
import { Skeleton } from '@fa/ui/components/skeleton'
import { useMediaQuery } from '@fa/ui/hooks/useMediaQuery'
import { useNow } from '@fa/ui/hooks/useNow'
import { useLocale, useTranslations } from 'next-intl'

export function RunsView() {
    const t = useTranslations('runs')
    const locale = useLocale()
    const now = useNow()
    const isDesktop = useMediaQuery('(width >= 40rem)')

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
                    {runs ? (
                        <>
                            <div className="sm:hidden">
                                <RunsCards runs={runs.items} cityNames={cityNames} />
                            </div>
                            {isDesktop && (
                                // useVirtualizer sizes rows from its scroll box, which has no size while hidden,
                                // so the table only mounts where it is shown; phones get the card list instead.
                                <RunsTable runs={runs.items} cityNames={cityNames} />
                            )}
                        </>
                    ) : (
                        <Skeleton className="h-64" />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
