'use client'

import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { RefreshButton } from '@/components/city/RefreshButton'
import { UpdatedChip } from '@/components/city/UpdatedChip'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { getCityRegion } from '@/lib/city-region'
import { isRefreshOffered } from '@/lib/refresh-due'
import { MedianOverview, MedianOverviewSkeleton, MedianSeries } from '@fa/charts/MedianOverview'
import { City, LatestResponse } from '@fa/shared/api'
import { computeEnsemble, computeMedianDirection } from '@fa/shared/ensemble'
import { getCityName } from '@fa/shared/format'
import { buildSlots, getSlotStart, toSlotSeries } from '@fa/shared/slots'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { Button } from '@fa/ui/components/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@fa/ui/components/card'
import { Skeleton } from '@fa/ui/components/skeleton'
import { cn } from '@fa/ui/lib/cn'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'

interface SkeletonProps {
    status: string
}

const getVariableMedians = (hourly: Record<Variable, LatestResponse>, slots: string[]) =>
    Object.fromEntries(
        VARIABLES.map(({ id, aggregation }) => {
            const { steps, series } = hourly[id]
            const values = computeEnsemble(
                series.map((s) => toSlotSeries(steps, s.values, slots, aggregation)),
                slots.length,
            ).median

            return [id, { steps: slots, values }]
        }),
    ) as Record<Variable, MedianSeries>

const getWindDirections = (wind: LatestResponse, slots: string[]) =>
    wind.directions
        ? computeMedianDirection(
              wind.directions.map((d) => toSlotSeries(wind.steps, d.values, slots, 'instant')),
              slots.length,
          )
        : null

// Same header and panel structure as the loaded card, so nothing moves when the data arrives.
export const OverviewCardSkeleton = ({ status }: SkeletonProps) => (
    <Card className="gap-0">
        <CardHeader>
            <CardTitle className="flex h-7 items-center gap-2 text-xl font-normal text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">{status}</span>
            </CardTitle>
            <CardAction className="flex items-center gap-2 max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2 max-sm:justify-self-start">
                <Skeleton className="hidden h-7 w-28 rounded-full lg:block" />
                <Skeleton className="h-7 w-22" />
                <Skeleton className="h-7 w-30" />
            </CardAction>
        </CardHeader>
        <CardContent>
            <MedianOverviewSkeleton />
        </CardContent>
    </Card>
)

interface IProps {
    city: City
    hourly: Record<Variable, LatestResponse>
    anchor: Date
    now: Date | null
    isFetching?: boolean
    onRefresh?: () => void
}

// `anchor` is the local 3-hour slot the run was fetched in, where the chart starts.
export function OverviewCard({ city, hourly, anchor, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const currentSlot = now ? getSlotStart(now, city.timezone) : anchor
    const isOutdated = isRefreshOffered(hourly[Variable.Temp].fetchedAt, now)
    const modelCount = hourly[Variable.Temp].series.length
    const slots = useMemo(() => buildSlots(anchor), [anchor])
    const medians = useMemo(() => getVariableMedians(hourly, slots), [hourly, slots])
    const directions = useMemo(() => getWindDirections(hourly[Variable.Wind], slots), [hourly, slots])

    return (
        <Card className={cn('gap-0 transition-opacity', isFetching && 'opacity-70')}>
            <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2.5 text-xl tracking-tight">
                    <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                    <span className="min-w-0 sm:truncate">
                        <span className="font-bold">{name}</span>
                        {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                    </span>
                    <FavoriteToggle place={city} className="-ml-1" />
                </CardTitle>
                <CardAction className="flex items-center gap-2 max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2 max-sm:mt-2 max-sm:mb-3 max-sm:w-full max-sm:justify-self-stretch">
                    <UpdatedChip
                        issueTime={hourly[Variable.Temp].issueTime}
                        fetchedAt={hourly[Variable.Temp].fetchedAt}
                        timeZone={city.timezone}
                        now={now}
                        className="hidden lg:inline-flex"
                    />
                    <RefreshButton
                        isAvailable={isOutdated}
                        isFetching={isFetching}
                        onRefresh={onRefresh}
                        className="max-sm:w-full max-sm:flex-1"
                        wrapperClassName="max-sm:flex-1"
                    />
                    <Button asChild size="sm" className="max-sm:flex-1">
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
                    now={now}
                    summaryStart={currentSlot}
                    ariaLabel={t('aria', { name, count: modelCount })}
                />
            </CardContent>
        </Card>
    )
}
