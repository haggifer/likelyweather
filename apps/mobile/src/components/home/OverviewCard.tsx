import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { City, LatestResponse } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { computeEnsemble, computeMedianDirection } from '@fa/shared/ensemble'
import { getCityName } from '@fa/shared/format'
import { buildSlots, getSlotStart, toSlotSeries } from '@fa/shared/slots'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { MedianOverview, MedianSeries } from '../charts/MedianOverview'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { RefreshButton } from '../city/RefreshButton'
import { UpdatedChip } from '../city/UpdatedChip'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/Text'

const styles = StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 19, fontWeight: '700' },
    region: { fontSize: 15, fontWeight: '500' },
    actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    grow: { flex: 1 },
})

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

interface IProps {
    city: City
    hourly: Record<Variable, LatestResponse>
    anchor: Date
    now: Date
    isFetching: boolean
    onRefresh: () => void
}

// `anchor` is the local 3-hour slot the run was fetched in, where the chart starts.
export function OverviewCard({ city, hourly, anchor, now, isFetching, onRefresh }: IProps) {
    const t = useTranslations('overview')
    const locale = useLocale()
    const router = useRouter()
    const { colors } = useTheme()

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const temp = hourly[Variable.Temp]
    const slots = useMemo(() => buildSlots(anchor), [anchor])
    const medians = useMemo(() => getVariableMedians(hourly, slots), [hourly, slots])
    const directions = useMemo(() => getWindDirections(hourly[Variable.Wind], slots), [hourly, slots])

    return (
        <Card style={isFetching && { opacity: 0.7 }}>
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
                <UpdatedChip fetchedAt={temp.fetchedAt} now={now} />
                <View style={styles.grow} />
                <RefreshButton
                    isAvailable={isRefreshOffered(temp.fetchedAt, now)}
                    isFetching={isFetching}
                    onRefresh={onRefresh}
                />
                <Button icon={ArrowRight} label={t('details')} onPress={() => router.push(`/city/${city.slug}`)} />
            </View>
            <MedianOverview
                series={medians}
                directions={directions}
                timeZone={city.timezone}
                locale={locale}
                now={now}
                summaryStart={getSlotStart(now, city.timezone)}
                accessibilityLabel={t('aria', { name, count: temp.series.length })}
            />
        </Card>
    )
}
