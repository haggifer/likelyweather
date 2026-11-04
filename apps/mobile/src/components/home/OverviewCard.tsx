import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { getOverviewRun, getOverviewSeries, hasOverviewValues, OverviewHourly } from '@fa/chart-core/overview-stats'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { getVisiblePanels, PanelVariable } from '@fa/shared/overview-panels'
import { Place } from '@fa/shared/places'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { useViewMode } from '../../hooks/useViewMode'
import { cn } from '../../lib/cn'
import { MedianOverview, MedianOverviewSkeleton } from '../charts/MedianOverview'
import { NoDataOverlay } from '../charts/NoDataOverlay'
import { OverviewTable } from '../charts/OverviewTable'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { RefreshButton } from '../city/RefreshButton'
import { UpdatedChip } from '../city/UpdatedChip'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { BLEED_CARD } from '../ui/EdgeSheet'
import { FlagIcon } from '../ui/FlagIcon'
import { Icon } from '../ui/icon'
import { LoadingStatus } from '../ui/LoadingStatus'
import { Skeleton } from '../ui/skeleton'
import { Text } from '../ui/text'
import { OverviewPanelsMenu } from './OverviewPanelsMenu'
import { ViewModeToggle } from './ViewModeToggle'

const CARD = cn('gap-0 pt-3 pb-4', BLEED_CARD)
const HEADER = 'gap-1 px-4'
const TITLE_ROW = 'flex-row items-center gap-2.5'
const TITLE = 'text-lg leading-snug font-bold tracking-tight'
// The age, Refresh, Variables and the table toggle are icons, and Open details takes the rest of the row; the row is
// 36 px tall with 16 px icons and text.
const ACTIONS = 'mt-2 mb-3 flex-row items-center gap-2'
const NO_BREAK_SPACE = ' '

interface SkeletonProps {
    status: string
}

const ActionsSkeleton = () => (
    <View className={ACTIONS}>
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
        <Skeleton className="h-9 flex-1" />
    </View>
)

// The loaded card's rows, as the web's OverviewCardSkeleton, so nothing moves when the data arrives. Shown only until
// the place is known: from then on the card itself draws, with its title.
export function OverviewCardSkeleton({ status }: SkeletonProps) {
    const { panels } = useOverviewPanels()

    const visible = useMemo(() => getVisiblePanels(panels), [panels])

    return (
        <Card className={CARD}>
            <CardHeader className={HEADER}>
                <View className={TITLE_ROW}>
                    {/* A zero-width line of title text keeps the status row at the title's height. */}
                    <Text className={cn(TITLE, '-mr-2 w-0')}>{NO_BREAK_SPACE}</Text>
                    <LoadingStatus label={status} />
                </View>
                <ActionsSkeleton />
            </CardHeader>
            <CardContent>
                <MedianOverviewSkeleton panels={visible} />
            </CardContent>
        </Card>
    )
}

interface IProps {
    // The title's place: a stored one draws it before the city's record arrives.
    place: Place
    city: City | undefined
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    hourly: OverviewHourly
    // The local 3-hour slot the run was fetched in, where the chart starts; null until every shown panel's run has
    // arrived, and until then the card keeps the skeleton's actions and panels.
    anchor: Date | null
    // Read out while the panels load.
    status: string
    now: Date
    isFetching?: boolean
    onRefresh: () => void
}

// The title draws as soon as the place is known, as on the web; the panels wait for each other, so none pushes the
// next one down.
export function OverviewCard({
    place,
    city,
    panels,
    hourly,
    anchor,
    status,
    now,
    isFetching = false,
    onRefresh,
}: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const router = useRouter()
    const { panels: storedPanels, setPanels } = useOverviewPanels()

    const { isTable } = useViewMode()

    const name = getCityName(place, locale)
    const region = getCityRegion(place, locale)
    const overview = useMemo(() => (anchor ? getOverviewSeries(hourly, anchor) : null), [hourly, anchor])
    const hasData = useMemo(() => !overview || hasOverviewValues(overview.medians), [overview])
    const run = overview ? getOverviewRun(hourly, panels) : undefined

    return (
        <Card className={cn(CARD, isFetching && 'opacity-70')}>
            <CardHeader className={HEADER}>
                <View className={TITLE_ROW}>
                    <FlagIcon countryCode={place.countryCode} width={24} />
                    <Text className={cn(TITLE, 'flex-1')}>
                        {name}
                        {region ? (
                            <Text className={cn(TITLE, 'font-medium text-muted-foreground')}>, {region}</Text>
                        ) : null}
                    </Text>
                    <FavoriteToggle place={place} className="size-9" />
                </View>
                {city && run && overview ? (
                    <View className={ACTIONS}>
                        <UpdatedChip fetchedAt={run.fetchedAt} now={now} isCompact />
                        <RefreshButton
                            isIconOnly
                            isAvailable={isRefreshOffered(run.fetchedAt, now)}
                            isFetching={isFetching}
                            onRefresh={onRefresh}
                        />
                        <OverviewPanelsMenu panels={storedPanels} onChange={setPanels} isLabelHiddenOnPhones />
                        <ViewModeToggle />
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onPress={() => router.push(`/city/${city.slug}`)}
                            className="h-9 flex-1"
                        >
                            <Text className="text-sm">{t('details')}</Text>
                            <Icon as={ArrowRight} className="size-4" />
                        </Button>
                    </View>
                ) : (
                    <ActionsSkeleton />
                )}
            </CardHeader>
            <CardContent className="relative">
                {!city || !run || !overview ? (
                    <View accessibilityLabel={status} accessibilityLiveRegion="polite">
                        <MedianOverviewSkeleton panels={panels} />
                    </View>
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
                        accessibilityLabel={t('aria', { name, count: run.series.length })}
                    />
                )}
                {!hasData && <NoDataOverlay message={t('noData')} />}
            </CardContent>
        </Card>
    )
}
