'use client'

import MedianOverview, { MedianOverviewSkeleton, MedianSeries } from '@/charts/MedianOverview'
import UpdatedChip from '@/components/city/UpdatedChip'
import FlagIcon from '@/components/shell/FlagIcon'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getCityName, getCountryName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { City, LatestResponse } from '@/shared/api'
import { computeEnsemble, computeMedianDirection } from '@/shared/ensemble'
import { buildSlots, getSlotStart, toSlotSeries } from '@/shared/slots'
import { Variable, VARIABLES } from '@/shared/variables'
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'

interface IProps {
    city: City
    hourly: Record<Variable, LatestResponse>
    anchor: Date
    now: Date | null
    isFetching?: boolean
    onRefresh?: () => void
}

interface SkeletonProps {
    status: string
}

// Same header and panel structure as the loaded card, so nothing moves when the data arrives.
export const OverviewCardSkeleton = ({ status }: SkeletonProps) => (
    <Card className="gap-4">
        <CardHeader>
            <CardTitle className="flex h-7 items-center gap-2 text-xl font-normal text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">{status}</span>
            </CardTitle>
            <CardAction className="flex items-center gap-2">
                <Skeleton className="hidden h-7 w-53 rounded-full lg:block" />
                <Skeleton className="h-7 w-22" />
                <Skeleton className="h-7 w-30" />
            </CardAction>
        </CardHeader>
        <CardContent>
            <MedianOverviewSkeleton />
        </CardContent>
    </Card>
)

// Presentational: the landing page feeds it live queries, the Theme Lab gallery feeds it the static dump. The chart
// starts at `anchor`, the local 3-hour slot the data arrived in; once `now` has moved into a later slot the chart is
// stale, which shows the "now" line and enables the refresh.
export default function OverviewCard({ city, hourly, anchor, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const name = getCityName(city, locale)
    const region = [city.admin1, getCountryName(city.countryCode, city.country, locale)].filter(Boolean).join(', ')
    const slots = useMemo(() => buildSlots(anchor), [anchor])
    const medians = useMemo(
        () =>
            Object.fromEntries(
                VARIABLES.map(({ id, aggregation }) => {
                    const { steps, series } = hourly[id]
                    const values = computeEnsemble(
                        series.map((s) => toSlotSeries(steps, s.values, slots, aggregation)),
                        slots.length,
                    ).median

                    return [id, { steps: slots, values }]
                }),
            ) as Record<Variable, MedianSeries>,
        [hourly, slots],
    )
    const directions = useMemo(() => {
        const wind = hourly[Variable.Wind]

        return wind.directions
            ? computeMedianDirection(
                  wind.directions.map((d) => toSlotSeries(wind.steps, d.values, slots, 'instant')),
                  slots.length,
              )
            : null
    }, [hourly, slots])
    const currentSlot = now ? getSlotStart(now, city.timezone) : anchor
    const isStale = currentSlot > anchor
    const modelCount = hourly[Variable.Temp].series.length
    const refreshButton = (
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={!onRefresh || !isStale || isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} /> {t('refresh')}
        </Button>
    )

    return (
        <Card className={cn('gap-4 transition-opacity', isFetching && 'opacity-70')}>
            <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2.5 text-xl tracking-tight">
                    <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                    <span className="truncate">
                        <span className="font-bold">{name}</span>
                        {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                    </span>
                </CardTitle>
                <CardAction className="flex items-center gap-2">
                    <UpdatedChip
                        issueTime={hourly[Variable.Temp].issueTime}
                        fetchedAt={hourly[Variable.Temp].fetchedAt}
                        timeZone={city.timezone}
                        now={now}
                        className="hidden lg:inline-flex"
                    />
                    {isStale ? (
                        refreshButton
                    ) : (
                        // A disabled button gets no pointer events, so the tooltip hangs on a focusable wrapper.
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    tabIndex={0}
                                    className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {refreshButton}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>{t('upToDate')}</TooltipContent>
                        </Tooltip>
                    )}
                    <Button asChild size="sm">
                        <Link href={`/city/${city.slug}`}>
                            {t('details')} <ArrowRight />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <MedianOverview
                    series={medians}
                    directions={directions}
                    timeZone={city.timezone}
                    locale={locale}
                    now={isStale ? now : null}
                    summaryStart={currentSlot}
                    ariaLabel={t('aria', { name, count: modelCount })}
                />
            </CardContent>
        </Card>
    )
}
