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
    actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    grow: { flex: 1 },
    // A zero-width line of title text keeps the skeleton's status row at the title's height.
    titleStrut: { width: 0, marginRight: -8, fontSize: 19, fontWeight: '700' },
})

// The English buttons' widths; other languages differ by a few pixels at most.
const PANELS_WIDTH = 36
const REFRESH_WIDTH = 104
const DETAILS_WIDTH = 134
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
                <View style={styles.grow} />
                <Skeleton height={36} width={REFRESH_WIDTH} />
                <Skeleton height={36} width={PANELS_WIDTH} />
                <Skeleton height={36} width={DETAILS_WIDTH} />
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
                <UpdatedChip fetchedAt={run.fetchedAt} issueTime={run.issueTime} timeZone={city.timezone} now={now} />
                <View style={styles.grow} />
                <RefreshButton
                    isAvailable={isRefreshOffered(run.fetchedAt, now)}
                    isFetching={isFetching}
                    onRefresh={onRefresh}
                />
                {/* Icon-only: with a label, a third button would push Open details onto a line of its own on a phone. */}
                <Button
                    icon={SlidersHorizontal}
                    variant="outline"
                    onPress={onCustomize}
                    accessibilityLabel={t('customize')}
                />
                <Button endIcon={ArrowRight} label={t('details')} onPress={() => router.push(`/city/${city.slug}`)} />
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
