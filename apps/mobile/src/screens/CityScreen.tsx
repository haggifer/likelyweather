import { isNotFound } from '@fa/api-client/api'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import {
    countRainySteps,
    formatSpread,
    getDashboardStats,
    getFutureRange,
    getPrecipTotals,
    getReadoutIndex,
    getSlotEnd,
    PRECIP_WINDOW_HOURS,
    PrecipTotals,
    sumValues,
} from '@fa/chart-core/dashboard-stats'
import { City } from '@fa/shared/api'
import { formatDateKey, formatNumber, formatPeriodLabel, formatStepLabel, getCityName } from '@fa/shared/format'
import { ModelId } from '@fa/shared/models'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { ChartFrame } from '../components/charts/ChartFrame'
import { PrecipPanel } from '../components/charts/PrecipPanel'
import { SpaghettiChart } from '../components/charts/SpaghettiChart'
import { CityHeader, HEADER_BUTTON_SIZE } from '../components/city/CityHeader'
import { CityTitle } from '../components/city/CityTitle'
import { DashboardSkeleton } from '../components/city/DashboardSkeleton'
import { DisagreementTiles } from '../components/city/DisagreementTiles'
import { ModelLegend } from '../components/city/ModelLegend'
import { SeriesTable } from '../components/city/SeriesTable'
import { VariableSwitch } from '../components/city/VariableSwitch'
import { SearchBox } from '../components/home/SearchBox'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { LoadingStatus } from '../components/ui/LoadingStatus'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Skeleton } from '../components/ui/Skeleton'
import { Text } from '../components/ui/Text'
import { useNow } from '../hooks/useNow'
import { useSelectedVariable } from '../hooks/useSelectedVariable'
import { useTheme } from '../hooks/useTheme'
import { getSlugTitle } from '../lib/city-slug'
import { setSelectedCity } from '../lib/selected-city-store'

const GAP = 12
// The switch sticks under the native header; its bar keeps 8 px of page colour around it while content scrolls under.
const BAR_PADDING = 8
const REFRESH_PLACEHOLDER_WIDTH = 104
// The header is the scroll's first child and the variable bar its second, the one that sticks.
const STICKY_INDICES = [1]

const styles = StyleSheet.create({
    content: { padding: 16, paddingTop: 8, gap: GAP },
    bar: { marginHorizontal: -16, marginVertical: -BAR_PADDING, paddingHorizontal: 16, paddingVertical: BAR_PADDING },
    header: { gap: 8 },
    note: { fontSize: 12, lineHeight: 17 },
    legend: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
    notFound: { alignItems: 'center', gap: 12, paddingVertical: 32 },
    notFoundTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
    notFoundBody: { fontSize: 14, textAlign: 'center' },
    search: { alignSelf: 'stretch' },
})

const toggle = (list: ModelId[], id: ModelId) => (list.includes(id) ? list.filter((m) => m !== id) : [...list, id])

const getReadoutLabel = (step: string, variable: Variable, timeZone: string, locale: string) =>
    variable === Variable.Precip
        ? formatPeriodLabel(step, getSlotEnd(step), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

// The panel does not depend on the selected variable or the scrub, so the dashboard keeps one element for it and a
// variable switch or a scrub leaves its drawing alone, as the web's.
const renderPrecipChart = (
    precip: PrecipTotals | null,
    error: unknown,
    onRetry: () => void,
    timeZone: string,
    locale: string,
) => {
    if (precip) {
        return (
            <PrecipPanel
                steps={precip.steps}
                series={precip.series}
                median={precip.median}
                chance={precip.chance}
                timeZone={timeZone}
                locale={locale}
                windowHours={PRECIP_WINDOW_HOURS}
            />
        )
    }

    return error ? <ErrorNotice error={error} onRetry={onRetry} /> : <Skeleton height={230} />
}

// The slug names the place while the city itself is loading, missing or failing, so the screen always has its heading.
const SlugHeading = ({ slug, children }: { slug: string; children?: ReactNode }) => {
    const locale = useLocale()

    const { name, region, countryCode } = getSlugTitle(slug, locale)

    return (
        <CityTitle name={name} region={region} countryCode={countryCode}>
            {children}
        </CityTitle>
    )
}

const VariableBar = ({ value, onChange }: { value: Variable; onChange: (variable: Variable) => void }) => {
    const { colors } = useTheme()

    return (
        <View style={[styles.bar, { backgroundColor: colors.background }]}>
            <VariableSwitch value={value} onChange={onChange} />
        </View>
    )
}

interface DashboardProps {
    city: City
}

// The web dashboard's phone layout: the header, the variable switch pinned under the native header, the chart card
// with its model list, the disagreement tiles and the precipitation panel.
const Dashboard = ({ city }: DashboardProps) => {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const tInline = useTranslations('variablesInline')
    const locale = useLocale()
    const now = useNow()
    const router = useRouter()
    const { colors } = useTheme()
    const { variable, setVariable } = useSelectedVariable()

    const [hoverStep, setHoverStep] = useState<string | null>(null)
    const [hidden, setHidden] = useState<ModelId[]>([])
    const [isMedianHidden, setIsMedianHidden] = useState(false)

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
    const { error: precipError, refetch: refetchPrecip } = precipQuery
    const precipChart = useMemo(
        () => renderPrecipChart(precip, precipError, () => void refetchPrecip(), timeZone, locale),
        [precip, precipError, refetchPrecip, timeZone, locale],
    )

    const handleSwitchCity = (slug: string) => {
        setSelectedCity(slug)
        router.replace(`/city/${slug}`)
    }
    const handleVariable = (next: Variable) => {
        setVariable(next)
        setHoverStep(null)
    }
    const handleRetry = () => {
        void latestQuery.refetch()
        void precipQuery.refetch()
    }
    const handleReset = () => {
        setHidden([])
        setIsMedianHidden(false)
    }

    if (!latest || !derived) {
        return (
            <ScreenScroll
                contentContainerStyle={styles.content}
                stickyHeaderIndices={STICKY_INDICES}
                keyboardShouldPersistTaps="handled"
            >
                <CityHeader city={city} onSelectCity={handleSwitchCity} />
                <VariableBar value={variable} onChange={handleVariable} />
                {latestQuery.isError || precipQuery.isError ? (
                    <ErrorNotice error={latestQuery.error ?? precipQuery.error} onRetry={handleRetry} />
                ) : (
                    <LoadingStatus label={t('fetching', { name: getCityName(city, locale) })} />
                )}
                <DashboardSkeleton gap={GAP} />
            </ScreenScroll>
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
    const noteStyle = [styles.note, { color: colors['muted-foreground'] }]

    return (
        <ScreenScroll
            contentContainerStyle={styles.content}
            stickyHeaderIndices={STICKY_INDICES}
            keyboardShouldPersistTaps="handled"
        >
            <CityHeader city={city} onSelectCity={handleSwitchCity} />
            <VariableBar value={variable} onChange={handleVariable} />
            <ChartFrame
                title={tv(variable)}
                summary={summary}
                isFetching={latestQuery.isFetching && latestQuery.isPlaceholderData}
                table={
                    <SeriesTable
                        steps={latest.steps}
                        series={latest.series}
                        stats={derived.stats}
                        decimals={info.decimals}
                        timeZone={timeZone}
                        locale={locale}
                    />
                }
            >
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
                {variable === Variable.Wind && <Text style={noteStyle}>{t('windArrows')}</Text>}
                <View style={[styles.legend, { borderTopColor: colors.border }]}>
                    <ModelLegend
                        series={latest.series}
                        median={derived.stats.median[readoutIndex]}
                        readoutIndex={readoutIndex}
                        readoutLabel={getReadoutLabel(latest.steps[readoutIndex], variable, timeZone, locale)}
                        direction={variable === Variable.Wind ? (derived.directions?.[readoutIndex] ?? null) : null}
                        variable={variable}
                        hidden={hidden}
                        isMedianHidden={isMedianHidden}
                        onToggleHidden={(id) => setHidden((list) => toggle(list, id))}
                        onToggleMedian={() => setIsMedianHidden((v) => !v)}
                        onReset={handleReset}
                    />
                </View>
            </ChartFrame>
            <DisagreementTiles days={derived.disagreement} variable={variable} />
            <ChartFrame title={t('precipTitle')} description={t('precipDescription')} summary={precipSummary}>
                {precipChart}
            </ChartFrame>
        </ScreenScroll>
    )
}

// The native header names nothing: the body's heading names the place, as on the web, where the top bar has no title.
export function CityScreen() {
    const tCity = useTranslations('city')
    const router = useRouter()
    const { colors } = useTheme()
    const { slug } = useLocalSearchParams<{ slug: string }>()

    const { data: city, error, refetch } = useCity(slug)

    // Home opens on the city viewed last, like the web's "Back to overview" link.
    useEffect(() => {
        if (city) setSelectedCity(city.slug)
    }, [city])

    if (error && isNotFound(error)) {
        return (
            <ScreenScroll contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <SlugHeading slug={slug} />
                <View style={styles.notFound}>
                    <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>{tCity('notFound')}</Text>
                    <Text style={[styles.notFoundBody, { color: colors['muted-foreground'] }]}>
                        {tCity('notFoundBody')}
                    </Text>
                    <View style={styles.search}>
                        <SearchBox onSelectCity={(next) => router.replace(`/city/${next}`)} />
                    </View>
                </View>
            </ScreenScroll>
        )
    }

    if (error) {
        return (
            <ScreenScroll contentContainerStyle={styles.content}>
                <SlugHeading slug={slug} />
                <ErrorNotice error={error} onRetry={() => void refetch()} />
            </ScreenScroll>
        )
    }

    if (!city) {
        return (
            <ScreenScroll contentContainerStyle={styles.content} scrollEnabled={false}>
                <View style={styles.header}>
                    <SlugHeading slug={slug}>
                        <Skeleton width={HEADER_BUTTON_SIZE} height={HEADER_BUTTON_SIZE} />
                        <Skeleton width={HEADER_BUTTON_SIZE} height={HEADER_BUTTON_SIZE} />
                    </SlugHeading>
                    <Skeleton
                        width={REFRESH_PLACEHOLDER_WIDTH}
                        height={HEADER_BUTTON_SIZE}
                        style={{ alignSelf: 'flex-end' }}
                    />
                </View>
                <Skeleton height={HEADER_BUTTON_SIZE} />
                <DashboardSkeleton gap={GAP} />
            </ScreenScroll>
        )
    }

    return <Dashboard city={city} />
}
