'use client'

import { MedianOverview, MedianOverviewSkeleton } from '@/components/charts/MedianOverview'
import { OverviewTable } from '@/components/charts/OverviewTable'
import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { PHONE_ICON } from '@/components/city/overview-controls'
import { OverviewPanelsMenu } from '@/components/city/OverviewPanelsMenu'
import { RefreshButton } from '@/components/city/RefreshButton'
import { UpdatedChip } from '@/components/city/UpdatedChip'
import { ViewModeToggle } from '@/components/city/ViewModeToggle'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOverviewPanels } from '@/hooks/useOverviewPanels'
import { useViewMode } from '@/hooks/useViewMode'
import { cn } from '@/lib/cn'
import { FILL_HEIGHT_PARENT } from '@/lib/fill-height'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { getOverviewRun, getOverviewSeries, OverviewHourly } from '@fa/chart-core/overview-stats'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'

interface SkeletonProps {
    status: string
}

// On phones the card runs edge to edge (`data-bleed`, globals.css), so its charts get the screen's whole width.
const CARD = 'gap-0 max-sm:pt-3'
const ACTIONS = 'flex items-center gap-2 max-sm:mt-2 max-sm:mb-3 max-sm:w-full'
const CONTENT = 'sm:mt-2'
// On phones the age, Refresh, Variables and the table toggle are icons, and Open details takes the rest of the row
// with 16 px text.
const PHONE_BUTTON = 'max-sm:h-9 max-sm:flex-1 max-sm:text-[1rem] max-sm:[&_svg]:size-4'
const TITLE = 'flex min-w-0 flex-1 items-center gap-2.5 text-lg tracking-tight sm:text-xl'

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
                <Skeleton className="h-7 w-22 max-sm:size-9" />
                <Skeleton className="h-7 w-20 max-sm:size-9" />
                <Skeleton className="h-7 w-18 max-sm:size-9" />
                <Skeleton className="h-7 w-30 max-sm:h-9 max-sm:flex-1" />
            </CardAction>
        </CardHeader>
        <CardContent className={CONTENT}>
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

// `anchor` is the local 3-hour slot the run was fetched in, where the chart starts.
export function OverviewCard({ city, panels, hourly, anchor, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const { panels: storedPanels, setPanels } = useOverviewPanels()

    const { isTable } = useViewMode()

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    // The card is drawn once the first shown panel's run has arrived.
    const run = getOverviewRun(hourly, panels)!
    const isOutdated = isRefreshOffered(run.fetchedAt, now)
    const modelCount = run.series.length
    const { medians, directions, chance } = useMemo(() => getOverviewSeries(hourly, anchor), [hourly, anchor])

    return (
        <Card data-bleed className={cn(CARD, 'transition-opacity', FILL_HEIGHT_PARENT, isFetching && 'opacity-70')}>
            <CardHeader>
                <CardTitle className={TITLE}>
                    <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                    <span className="min-w-0">
                        <span className="font-bold">{name}</span>
                        {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                    </span>
                    <FavoriteToggle place={city} className="-ml-1 max-sm:ml-auto" />
                </CardTitle>
                <CardAction className={ACTIONS}>
                    <UpdatedChip
                        issueTime={run.issueTime}
                        fetchedAt={run.fetchedAt}
                        timeZone={city.timezone}
                        now={now}
                        isIconOnPhones
                    />
                    <RefreshButton
                        isAvailable={isOutdated}
                        isFetching={isFetching}
                        onRefresh={onRefresh}
                        isIconOnPhones
                        className={PHONE_ICON}
                        wrapperClassName="shrink-0"
                    />
                    <OverviewPanelsMenu
                        panels={storedPanels}
                        onChange={setPanels}
                        isLabelHiddenOnPhones
                        className={PHONE_ICON}
                    />
                    <ViewModeToggle className={PHONE_ICON} />
                    <Button asChild variant="outline-primary" size="sm" className={PHONE_BUTTON}>
                        <Link href={`/city/${city.slug}`}>
                            {t('details')} <ArrowRight />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className={cn(CONTENT, FILL_HEIGHT_PARENT)}>
                {isTable ? (
                    <OverviewTable
                        panels={panels}
                        series={medians}
                        chance={chance}
                        timeZone={city.timezone}
                        locale={locale}
                    />
                ) : (
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
                )}
            </CardContent>
        </Card>
    )
}
