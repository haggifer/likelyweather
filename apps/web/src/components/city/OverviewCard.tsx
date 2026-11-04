'use client'

import { MedianOverview, MedianOverviewSkeleton } from '@/components/charts/MedianOverview'
import { NoDataOverlay } from '@/components/charts/NoDataOverlay'
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
import { getOverviewRun, getOverviewSeries, hasOverviewValues, OverviewHourly } from '@fa/chart-core/overview-stats'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { Place } from '@fa/shared/places'
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
const CONTENT = 'relative sm:mt-2'
const PHONE_BUTTON = 'touch:h-9 max-sm:flex-1 max-sm:text-sm max-sm:[&_svg]:size-4'
const TITLE = 'flex min-w-0 flex-1 items-center gap-2.5 text-lg tracking-tight sm:text-xl'

const ActionsSkeleton = () => (
    <CardAction className={ACTIONS}>
        <Skeleton className="hidden h-7 w-28 rounded-full lg:block" />
        <Skeleton className="h-7 w-22 touch:h-9 max-sm:w-9" />
        <Skeleton className="h-7 w-20 touch:h-9 max-sm:w-9" />
        <Skeleton className="h-7 w-18 touch:h-9 max-sm:w-9" />
        <Skeleton className="h-7 w-30 touch:h-9 max-sm:flex-1" />
    </CardAction>
)

// Same header and panel structure as the loaded card, so nothing moves when the data arrives. Shown only until the
// place is known: from then on the card itself draws, with its title.
export const OverviewCardSkeleton = ({ status }: SkeletonProps) => (
    <Card data-bleed className={CARD}>
        <CardHeader>
            <CardTitle className="flex h-7 items-center gap-2 text-xl font-normal text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">{status}</span>
            </CardTitle>
            <ActionsSkeleton />
        </CardHeader>
        <CardContent className={CONTENT}>
            <MedianOverviewSkeleton />
        </CardContent>
    </Card>
)

interface IProps {
    // The title's place: a stored one draws it before the city's record arrives.
    place: Place
    city: City | undefined
    panels: PanelVariable[]
    hourly: OverviewHourly
    // The local 3-hour slot the run was fetched in, where the chart starts; null until every shown panel's run has
    // arrived, and until then the card keeps the skeleton's actions and panels.
    anchor: Date | null
    // Read out while the panels load.
    status: string
    now: Date | null
    isFetching?: boolean
    onRefresh?: () => void
}

// The title draws as soon as the place is known and stays the same element when the panels arrive, so the page's
// largest text is painted once, early; the panels wait for each other, so none pushes the next one down.
export function OverviewCard({ place, city, panels, hourly, anchor, status, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const { panels: storedPanels, setPanels } = useOverviewPanels()

    const { isTable } = useViewMode()

    const name = getCityName(place, locale)
    const region = getCityRegion(place, locale)
    const overview = useMemo(() => (anchor ? getOverviewSeries(hourly, anchor) : null), [hourly, anchor])
    const hasData = useMemo(() => !overview || hasOverviewValues(overview.medians), [overview])
    const run = overview ? getOverviewRun(hourly, panels) : undefined

    return (
        <Card data-bleed className={cn(CARD, 'transition-opacity', FILL_HEIGHT_PARENT, isFetching && 'opacity-70')}>
            <CardHeader>
                <CardTitle className={TITLE}>
                    <FlagIcon countryCode={place.countryCode} className="h-4 w-6 shrink-0" />
                    <span className="min-w-0">
                        <span className="font-bold">{name}</span>
                        {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                    </span>
                    <FavoriteToggle place={place} className="-ml-1 max-sm:ml-auto" />
                </CardTitle>
                {city && run && overview ? (
                    <CardAction className={ACTIONS}>
                        <UpdatedChip
                            issueTime={run.issueTime}
                            fetchedAt={run.fetchedAt}
                            timeZone={city.timezone}
                            now={now}
                            isIconOnPhones
                        />
                        <RefreshButton
                            isAvailable={isRefreshOffered(run.fetchedAt, now)}
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
                ) : (
                    <ActionsSkeleton />
                )}
            </CardHeader>
            <CardContent className={cn(CONTENT, FILL_HEIGHT_PARENT)}>
                {!city || !run || !overview ? (
                    <>
                        <MedianOverviewSkeleton panels={panels} />
                        <p role="status" className="sr-only">
                            {status}
                        </p>
                    </>
                ) : isTable ? (
                    <OverviewTable
                        panels={panels}
                        series={overview.medians}
                        chance={overview.chance}
                        timeZone={city.timezone}
                        locale={locale}
                    />
                ) : (
                    <MedianOverview
                        key={city.slug}
                        panels={panels}
                        series={overview.medians}
                        directions={overview.directions}
                        chance={overview.chance}
                        timeZone={city.timezone}
                        locale={locale}
                        now={now}
                        ariaLabel={t('aria', { name, count: run.series.length })}
                    />
                )}
                {!hasData && <NoDataOverlay message={t('noData')} />}
            </CardContent>
        </Card>
    )
}
