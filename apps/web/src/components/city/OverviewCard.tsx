'use client'

import { MedianOverview, MedianOverviewSkeleton } from '@/components/charts/MedianOverview'
import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { OverviewPanelsMenu } from '@/components/city/OverviewPanelsMenu'
import { RefreshButton } from '@/components/city/RefreshButton'
import { UpdatedChip } from '@/components/city/UpdatedChip'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import {
    getOverviewChance,
    getOverviewDirections,
    getOverviewMedians,
    OverviewHourly,
} from '@fa/chart-core/overview-stats'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { buildSlots } from '@fa/shared/slots'
import { Variable } from '@fa/shared/variables'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'

interface SkeletonProps {
    status: string
}

// On phones the card runs edge to edge (`data-bleed`, globals.css), so its charts get the screen's whole width.
const CARD = 'gap-0 max-sm:pt-3'
const ACTIONS =
    'flex items-center gap-2 max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2 max-sm:mt-2 max-sm:mb-3 max-sm:w-full max-sm:justify-self-stretch'
const PHONE_BUTTON = 'max-sm:h-8 max-sm:flex-1 max-sm:text-sm'
const TITLE = 'flex min-w-0 items-center gap-2.5 text-lg tracking-tight sm:text-xl'

// Same header and panel structure as the loaded card, so nothing moves when the data arrives.
export const OverviewCardSkeleton = ({ status }: SkeletonProps) => (
    <Card data-bleed className={CARD}>
        <CardHeader>
            <CardTitle className="flex h-7 items-center gap-2 text-xl font-normal text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">{status}</span>
            </CardTitle>
            <CardAction className={ACTIONS}>
                <Skeleton className="hidden h-7 w-28 rounded-full lg:block" />
                <Skeleton className="h-7 w-22 max-sm:h-8 max-sm:flex-1" />
                <Skeleton className="h-7 w-30 max-sm:h-8 max-sm:flex-1" />
            </CardAction>
        </CardHeader>
        <CardContent>
            <MedianOverviewSkeleton />
        </CardContent>
    </Card>
)

interface IProps {
    city: City
    panels: PanelVariable[]
    hourly: OverviewHourly
    anchor: Date
    now: Date | null
    isFetching?: boolean
    onRefresh?: () => void
}

// The runs of the shown panels come from one fetch, so any of them carries the run's times and model count.
const getRun = (hourly: OverviewHourly, panels: PanelVariable[]) => hourly[panels[0]]!

// `anchor` is the local 3-hour slot the run was fetched in, where the chart starts.
export function OverviewCard({ city, panels, hourly, anchor, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const run = getRun(hourly, panels)
    const isOutdated = isRefreshOffered(run.fetchedAt, now)
    const modelCount = run.series.length
    const slots = useMemo(() => buildSlots(anchor), [anchor])
    const medians = useMemo(() => getOverviewMedians(hourly, slots), [hourly, slots])
    const directions = useMemo(() => getOverviewDirections(hourly[Variable.Wind], slots), [hourly, slots])
    const chance = useMemo(() => getOverviewChance(hourly[Variable.Precip], slots), [hourly, slots])

    return (
        <Card data-bleed className={cn(CARD, 'transition-opacity', isFetching && 'opacity-70')}>
            <CardHeader>
                <CardTitle className={TITLE}>
                    <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                    <span className="min-w-0 sm:truncate">
                        <span className="font-bold">{name}</span>
                        {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                    </span>
                    <FavoriteToggle place={city} className="-ml-1 max-sm:ml-auto" />
                    <OverviewPanelsMenu className="-ml-2 shrink-0 pointer-coarse:size-9" />
                </CardTitle>
                <CardAction className={ACTIONS}>
                    <UpdatedChip
                        issueTime={run.issueTime}
                        fetchedAt={run.fetchedAt}
                        timeZone={city.timezone}
                        now={now}
                    />
                    <RefreshButton
                        isAvailable={isOutdated}
                        isFetching={isFetching}
                        onRefresh={onRefresh}
                        className={cn(PHONE_BUTTON, 'max-sm:w-full')}
                        wrapperClassName="max-sm:flex-1"
                    />
                    <Button asChild size="sm" className={PHONE_BUTTON}>
                        <Link href={`/city/${city.slug}`}>
                            {t('details')} <ArrowRight />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <MedianOverview
                    key={city.slug}
                    panels={panels}
                    series={medians}
                    directions={directions}
                    chance={chance}
                    timeZone={city.timezone}
                    locale={locale}
                    now={now}
                    ariaLabel={t('aria', { name, count: modelCount })}
                />
            </CardContent>
        </Card>
    )
}
