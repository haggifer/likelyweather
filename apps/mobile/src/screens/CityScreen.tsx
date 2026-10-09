import { isNotFound } from '@fa/api-client/api'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import {
    countRainySteps,
    formatSpread,
    getDashboardStats,
    getFutureRange,
    getPrecipTotals,
    getReadoutIndex,
    getSlotEnd,
    PRECIP_WINDOW_HOURS,
    sumValues,
} from '@fa/chart-core/dashboard-stats'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { formatDateKey, formatNumber, formatPeriodLabel, formatStepLabel, getCityName } from '@fa/shared/format'
import { ModelId } from '@fa/shared/models'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { BarChart3, Search, Table2, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { PrecipPanel } from '../components/charts/PrecipPanel'
import { SpaghettiChart } from '../components/charts/SpaghettiChart'
import { DisagreementTiles } from '../components/city/DisagreementTiles'
import { FavoriteToggle } from '../components/city/FavoriteToggle'
import { ModelLegend } from '../components/city/ModelLegend'
import { RefreshButton } from '../components/city/RefreshButton'
import { SeriesTable } from '../components/city/SeriesTable'
import { UpdatedChip } from '../components/city/UpdatedChip'
import { VariableSwitch } from '../components/city/VariableSwitch'
import { SearchBox } from '../components/home/SearchBox'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { Skeleton } from '../components/ui/Skeleton'
import { useNow } from '../hooks/useNow'
import { useTheme } from '../hooks/useTheme'
import { getFlagEmoji } from '../lib/flag'

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16, paddingTop: 12 },
    bar: { paddingHorizontal: 16, paddingVertical: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontSize: 20, fontWeight: '700' },
    region: { fontSize: 13 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    grow: { flex: 1 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 14 },
    summary: { fontSize: 12, lineHeight: 17 },
    centered: { padding: 24, gap: 12, alignItems: 'stretch' },
    heading: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
})

const toggle = (list: ModelId[], id: ModelId) => (list.includes(id) ? list.filter((m) => m !== id) : [...list, id])

const getReadoutLabel = (step: string, variable: Variable, timeZone: string, locale: string) =>
    variable === Variable.Precip
        ? formatPeriodLabel(step, getSlotEnd(step), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

interface DashboardProps {
    city: City
}

// The web dashboard in one column: the chart with its model list, the disagreement tiles and the precipitation
// panel, with the variable switch pinned above the scroll.
const Dashboard = ({ city }: DashboardProps) => {
    const t = useTranslations('dashboard')
    const tc = useTranslations('chart')
    const tv = useTranslations('variables')
    const tInline = useTranslations('variablesInline')
    const tCity = useTranslations('city')
    const locale = useLocale()
    const now = useNow()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { colors } = useTheme()

    const [variable, setVariable] = useState(Variable.Temp)
    const [hoverStep, setHoverStep] = useState<string | null>(null)
    const [hidden, setHidden] = useState<ModelId[]>([])
    const [isMedianHidden, setIsMedianHidden] = useState(false)
    const [isTable, setIsTable] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)

    const latestQuery = useLatest(city.slug, variable)
    const precipQuery = useLatest(city.slug, Variable.Precip)

    const info = VARIABLE_BY_ID[variable]
    const timeZone = city.timezone
    // The precipitation query is shared by every variable, so its run anchors the chart.
    const anchorRun = precipQuery.data ?? latestQuery.data
    const anchor = useMemo(() => (anchorRun ? getChartStart(anchorRun, timeZone) : null), [anchorRun, timeZone])
    const slots = useMemo(() => (anchor ? buildSlots(anchor, DASHBOARD_HOURS) : null), [anchor])
    const latest = useMemo(
        () => (latestQuery.data && slots ? toSlotLatest(latestQuery.data, slots, info.aggregation) : null),
        [latestQuery.data, slots, info.aggregation],
    )
    const derived = useMemo(
        () => (latest ? getDashboardStats(latest, variable, timeZone, now) : null),
        [latest, variable, timeZone, now],
    )
    const precip = useMemo(
        () => (precipQuery.data && anchor ? getPrecipTotals(precipQuery.data, anchor) : null),
        [precipQuery.data, anchor],
    )
    const isFetching = latestQuery.isFetching || precipQuery.isFetching

    const handleVariable = (next: Variable) => {
        setVariable(next)
        setHoverStep(null)
    }
    const handleRefresh = () => void queryClient.refetchQueries({ queryKey: ['latest', city.slug], type: 'active' })
    const handleRetry = () => {
        void latestQuery.refetch()
        void precipQuery.refetch()
    }
    const handleSwitchCity = (slug: string) => router.replace(`/city/${slug}`)
    const handleReset = () => {
        setHidden([])
        setIsMedianHidden(false)
    }

    const renderHeader = () => (
        <View style={{ gap: 8 }}>
            {isSwitching ? (
                <SearchBox onSelectCity={handleSwitchCity} autoFocus />
            ) : (
                <View style={styles.titleRow}>
                    <View style={styles.grow}>
                        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                            {getFlagEmoji(city.countryCode)} {getCityName(city, locale)}
                        </Text>
                        <Text style={[styles.region, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                            {getCityRegion(city, locale)}
                        </Text>
                    </View>
                    <FavoriteToggle place={city} />
                </View>
            )}
            <View style={styles.actions}>
                {precipQuery.data && <UpdatedChip fetchedAt={precipQuery.data.fetchedAt} now={now} />}
                <View style={styles.grow} />
                <RefreshButton
                    // The precipitation query dates the run shown. When it failed before any run arrived there is no
                    // date, but Refresh must stay available: it is the only way to ask again.
                    isAvailable={
                        (precipQuery.isError && !precipQuery.data) || isRefreshOffered(precipQuery.data?.fetchedAt, now)
                    }
                    isFetching={isFetching}
                    onRefresh={handleRefresh}
                />
            </View>
        </View>
    )

    const switchButton = (
        <Pressable
            onPress={() => setIsSwitching((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tCity('change')}
        >
            {isSwitching ? <X size={22} color={colors.foreground} /> : <Search size={22} color={colors.foreground} />}
        </Pressable>
    )

    if (!latest || !derived) {
        return (
            <View style={{ flex: 1 }}>
                <Stack.Screen options={{ title: getCityName(city, locale), headerRight: () => switchButton }} />
                <View style={styles.bar}>
                    <VariableSwitch value={variable} onChange={handleVariable} />
                </View>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {renderHeader()}
                    {latestQuery.isError || precipQuery.isError ? (
                        <ErrorNotice error={latestQuery.error ?? precipQuery.error} onRetry={handleRetry} />
                    ) : (
                        <View style={styles.status} accessibilityRole="progressbar">
                            <ActivityIndicator size="small" color={colors['muted-foreground']} />
                            <Text style={[styles.text, { color: colors['muted-foreground'] }]}>
                                {t('fetching', { name: getCityName(city, locale) })}
                            </Text>
                        </View>
                    )}
                    <Skeleton height={360} />
                    <Skeleton height={200} />
                </ScrollView>
            </View>
        )
    }

    const visibleSeries = latest.series.filter((s) => !hidden.includes(s.modelId))
    const hoverIndex = hoverStep ? latest.steps.indexOf(hoverStep) : -1
    const readoutIndex = getReadoutIndex(latest.steps, hoverIndex, now, info.aggregation === 'sum')
    const futureRange = getFutureRange(derived.stats.median, latest.steps, now)
    const mostSplit = [...derived.disagreement].sort((a, b) => b.spread - a.spread)[0]
    const summary = t('summary', {
        variable: tInline(variable),
        count: latest.series.length,
        min: formatNumber(futureRange.min, info.decimals),
        max: formatNumber(futureRange.max, info.decimals),
        unit: info.unit,
        day: mostSplit ? formatDateKey(mostSplit.day, locale, { weekday: 'long' }) : '–',
        spread: formatSpread(mostSplit?.spread, info.decimals),
    })
    const precipSummary = precip
        ? t('precipSummary', {
              steps: countRainySteps(precip.chance),
              total: formatNumber(sumValues(precip.median), 1),
          })
        : null
    const tableToggle = (
        <Button
            variant="ghost"
            icon={isTable ? BarChart3 : Table2}
            label={isTable ? tc('chart') : tc('table')}
            onPress={() => setIsTable((v) => !v)}
            accessibilityLabel={isTable ? tc('showChart') : tc('showTable')}
        />
    )

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen options={{ title: getCityName(city, locale), headerRight: () => switchButton }} />
            <View style={[styles.bar, { backgroundColor: colors.background }]}>
                <VariableSwitch value={variable} onChange={handleVariable} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {renderHeader()}
                <Card
                    title={tv(variable)}
                    action={tableToggle}
                    style={latestQuery.isPlaceholderData && { opacity: 0.6 }}
                >
                    {isTable ? (
                        <SeriesTable
                            steps={latest.steps}
                            series={latest.series}
                            stats={derived.stats}
                            decimals={info.decimals}
                            timeZone={timeZone}
                            locale={locale}
                        />
                    ) : (
                        <SpaghettiChart
                            steps={latest.steps}
                            series={visibleSeries}
                            stats={derived.stats}
                            variable={variable}
                            timeZone={timeZone}
                            locale={locale}
                            accessibilityLabel={summary}
                            hoverIndex={hoverIndex >= 0 ? hoverIndex : null}
                            onHoverIndex={(i) => setHoverStep(i === null ? null : latest.steps[i])}
                            directions={variable === Variable.Wind ? derived.directions : null}
                            now={now}
                            isMedianHidden={isMedianHidden}
                        />
                    )}
                    {variable === Variable.Wind && !isTable && (
                        <Text style={[styles.summary, { color: colors['muted-foreground'] }]}>{t('windArrows')}</Text>
                    )}
                    <Text style={[styles.summary, { color: colors['muted-foreground'] }]}>{summary}</Text>
                    <View
                        style={{
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: colors.border,
                            paddingTop: 8,
                        }}
                    >
                        <ModelLegend
                            series={latest.series}
                            median={derived.stats.median[readoutIndex]}
                            readoutIndex={readoutIndex}
                            readoutLabel={getReadoutLabel(latest.steps[readoutIndex], variable, timeZone, locale)}
                            variable={variable}
                            hidden={hidden}
                            isMedianHidden={isMedianHidden}
                            onToggleHidden={(id) => setHidden((list) => toggle(list, id))}
                            onToggleMedian={() => setIsMedianHidden((v) => !v)}
                            onReset={handleReset}
                        />
                    </View>
                </Card>
                <DisagreementTiles days={derived.disagreement} variable={variable} />
                <Card title={t('precipTitle')} description={t('precipDescription')}>
                    {precip ? (
                        <PrecipPanel
                            steps={precip.steps}
                            series={precip.series}
                            median={precip.median}
                            chance={precip.chance}
                            timeZone={timeZone}
                            locale={locale}
                            windowHours={PRECIP_WINDOW_HOURS}
                        />
                    ) : precipQuery.isError ? (
                        <ErrorNotice error={precipQuery.error} onRetry={() => void precipQuery.refetch()} />
                    ) : (
                        <Skeleton height={230} />
                    )}
                    {precipSummary && (
                        <Text style={[styles.summary, { color: colors['muted-foreground'] }]}>{precipSummary}</Text>
                    )}
                </Card>
            </ScrollView>
        </View>
    )
}

export function CityScreen() {
    const tCity = useTranslations('city')
    const router = useRouter()
    const { colors } = useTheme()
    const { slug } = useLocalSearchParams<{ slug: string }>()

    const { data: city, error, refetch } = useCity(slug)

    if (error && isNotFound(error)) {
        return (
            <View style={[styles.centered, { flex: 1, backgroundColor: colors.background }]}>
                <Text style={[styles.heading, { color: colors.foreground }]}>{tCity('notFound')}</Text>
                <Text style={[styles.text, { color: colors['muted-foreground'], textAlign: 'center' }]}>
                    {tCity('notFoundBody')}
                </Text>
                <SearchBox onSelectCity={(next) => router.replace(`/city/${next}`)} />
            </View>
        )
    }

    if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

    if (!city) {
        return (
            <View style={styles.content}>
                <Skeleton height={28} width="60%" />
                <Skeleton height={360} />
            </View>
        )
    }

    return <Dashboard city={city} />
}
