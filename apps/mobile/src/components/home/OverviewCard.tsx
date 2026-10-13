import { isRefreshOffered } from '@fa/api-client/refresh-due'
import {
    getOverviewChance,
    getOverviewDirections,
    getOverviewMedians,
    OverviewHourly,
} from '@fa/chart-core/overview-stats'
import { City, LatestResponse } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { getVisiblePanels, PanelVariable } from '@fa/shared/overview-panels'
import { buildSlots } from '@fa/shared/slots'
import { Variable } from '@fa/shared/variables'
import { useRouter } from 'expo-router'
import { ArrowRight, SlidersHorizontal } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { useTheme } from '../../hooks/useTheme'
import { MedianOverview, MedianOverviewSkeleton } from '../charts/MedianOverview'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { RefreshButton } from '../city/RefreshButton'
import { UpdatedChip } from '../city/UpdatedChip'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FlagIcon } from '../ui/FlagIcon'
import { LoadingStatus } from '../ui/LoadingStatus'
import { Skeleton } from '../ui/Skeleton'
import { Text } from '../ui/Text'

const styles = StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 19, fontWeight: '700' },
    region: { fontSize: 15, fontWeight: '500' },
    // The age, Refresh and Panels are icons, and Open details takes the rest of the row (author, 2026-10-13).
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    details: { flex: 1 },
    // A zero-width line of title text keeps the skeleton's status row at the title's height.
    titleStrut: { width: 0, marginRight: -8, fontSize: 19, fontWeight: '700' },
})

const ICON_BUTTON = 36
const NO_BREAK_SPACE = ' '

interface SkeletonProps {
    status: string
}

// The loaded card's rows, the web's OverviewCardSkeleton: the status in the title's place, the three buttons, then the
// reader's readouts and panels, so nothing moves when the data arrives.
export function OverviewCardSkeleton({ status }: SkeletonProps) {
    const { panels } = useOverviewPanels()

    const visible = useMemo(() => getVisiblePanels(panels), [panels])

    return (
        <Card>
            <View style={styles.titleRow}>
                <Text style={styles.titleStrut}>{NO_BREAK_SPACE}</Text>
                <LoadingStatus label={status} />
            </View>
            <View style={styles.actions}>
                <Skeleton height={ICON_BUTTON} width={ICON_BUTTON} />
                <Skeleton height={ICON_BUTTON} width={ICON_BUTTON} />
                <View style={styles.details}>
                    <Skeleton height={ICON_BUTTON} />
                </View>
            </View>
            <MedianOverviewSkeleton panels={visible} />
        </Card>
    )
}

interface IProps {
    city: City
    // The visible panels, in the reader's order; `hourly` holds their runs and `run` the first panel's.
    panels: PanelVariable[]
    hourly: OverviewHourly
    run: LatestResponse
    anchor: Date
    now: Date
    isFetching: boolean
    onRefresh: () => void
    onCustomize: () => void
}

// `anchor` is the local 3-hour slot the run was fetched in, where the chart starts.
export function OverviewCard({ city, panels, hourly, run, anchor, now, isFetching, onRefresh, onCustomize }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const router = useRouter()
    const { colors } = useTheme()

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const slots = useMemo(() => buildSlots(anchor), [anchor])
    const medians = useMemo(() => getOverviewMedians(hourly, slots), [hourly, slots])
    const directions = useMemo(() => getOverviewDirections(hourly[Variable.Wind], slots), [hourly, slots])
    const chance = useMemo(() => getOverviewChance(hourly[Variable.Precip], slots), [hourly, slots])

    return (
        <Card isDimmed={isFetching}>
            <View style={styles.titleRow}>
                <FlagIcon countryCode={city.countryCode} width={24} />
                <Text style={[styles.title, { color: colors.foreground }]}>
                    {name}
                    {region ? (
                        <Text style={[styles.region, { color: colors['muted-foreground'] }]}>, {region}</Text>
                    ) : null}
                </Text>
                <FavoriteToggle place={city} />
            </View>
            <View style={styles.actions}>
                <UpdatedChip
                    fetchedAt={run.fetchedAt}
                    issueTime={run.issueTime}
                    timeZone={city.timezone}
                    now={now}
                    isCompact
                />
                <RefreshButton
                    isIconOnly
                    isAvailable={isRefreshOffered(run.fetchedAt, now)}
                    isFetching={isFetching}
                    onRefresh={onRefresh}
                />
                <Button
                    icon={SlidersHorizontal}
                    variant="outline"
                    onPress={onCustomize}
                    accessibilityLabel={t('customize')}
                />
                <Button
                    endIcon={ArrowRight}
                    label={t('details')}
                    onPress={() => router.push(`/city/${city.slug}`)}
                    style={styles.details}
                />
            </View>
            <MedianOverview
                key={city.slug}
                panels={panels}
                series={medians}
                directions={directions}
                chance={chance}
                timeZone={city.timezone}
                locale={locale}
                now={now}
                accessibilityLabel={t('aria', { name, count: run.series.length })}
            />
        </Card>
    )
}
