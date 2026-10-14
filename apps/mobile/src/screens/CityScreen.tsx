import { isNotFound } from '@fa/api-client/api'
import { useCity } from '@fa/api-client/hooks/useCity'
import { getReadoutIndex } from '@fa/chart-core/dashboard-stats'
import { useDashboardData } from '@fa/hooks/useDashboardData'
import { City, Series } from '@fa/shared/api'
import { getReadoutLabel } from '@fa/shared/dashboard'
import { EnsembleStats } from '@fa/shared/ensemble'
import { getCityName } from '@fa/shared/format'
import { ModelId } from '@fa/shared/models'
import { toggleItem } from '@fa/shared/toggle-item'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { ChartFrame } from '../components/charts/ChartFrame'
import { SpaghettiChart } from '../components/charts/SpaghettiChart'
import { CityHeader } from '../components/city/CityHeader'
import { CityTitle } from '../components/city/CityTitle'
import { DashboardSkeleton } from '../components/city/DashboardSkeleton'
import { DisagreementTiles } from '../components/city/DisagreementTiles'
import { ModelLegend } from '../components/city/ModelLegend'
import { SeriesTable } from '../components/city/SeriesTable'
import { VariableSwitch } from '../components/city/VariableSwitch'
import { SearchBox } from '../components/home/SearchBox'
import { EdgeSheet, FLAT_CARD } from '../components/ui/EdgeSheet'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { LoadingStatus } from '../components/ui/LoadingStatus'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Separator } from '../components/ui/separator'
import { Skeleton } from '../components/ui/skeleton'
import { Text } from '../components/ui/text'
import { useNow } from '../hooks/useNow'
import { useSelectedVariable } from '../hooks/useSelectedVariable'
import { getSlugTitle } from '../lib/city-slug'
import { setSelectedCity } from '../lib/selected-city-store'

// ScreenScroll adds the navigation bar's height to the content's bottom padding, which it reads from this style.
const CONTENT_STYLE = { padding: 16, paddingTop: 8, paddingBottom: 0, gap: 12 }
// The header is the scroll's first child and the variable bar its second, the one that sticks.
const STICKY_INDICES = [1]

interface Selection {
    variable: Variable
    step: string
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

// The switch sticks under the native header; its bar keeps the web's `py-2` of page colour around it while content
// scrolls under.
const VariableBar = ({ value, onChange }: { value: Variable; onChange: (variable: Variable) => void }) => (
    <View className="-mx-4 bg-background px-4 py-2">
        <VariableSwitch value={value} onChange={onChange} />
    </View>
)

interface SelectableChartProps {
    title: string
    table: ReactNode
    isFetching: boolean
    steps: string[]
    series: Series[]
    visibleSeries: Series[]
    stats: EnsembleStats
    directions: (number | null)[] | null
    variable: Variable
    timeZone: string
    locale: string
    summary: string
    now: Date
    hidden: ModelId[]
    isMedianHidden: boolean
    onToggleHidden: (id: ModelId) => void
    onToggleMedian: () => void
    onReset: () => void
}

// The chart and its model list hold the picked slot themselves, so a tap re-renders them and not the rest of the
// screen: the header, the disagreement tiles and the table. The list is the sheet's own section under the chart, so it
// stays while the table replaces the chart, as on the web.
const SelectableChart = ({
    title,
    table,
    isFetching,
    steps,
    series,
    visibleSeries,
    stats,
    directions,
    variable,
    timeZone,
    locale,
    summary,
    now,
    hidden,
    isMedianHidden,
    onToggleHidden,
    onToggleMedian,
    onReset,
}: SelectableChartProps) => {
    const t = useTranslations('dashboard')

    const [selection, setSelection] = useState<Selection | null>(null)

    const info = VARIABLE_BY_ID[variable]
    // A pick belongs to the variable it was made on, so switching variables drops it.
    const hoverStep = selection?.variable === variable ? selection.step : null
    const hoverIndex = hoverStep ? steps.indexOf(hoverStep) : -1
    const readoutIndex = getReadoutIndex(steps, hoverIndex, now, info.aggregation === 'sum')
    const windDirections = variable === Variable.Wind ? directions : null

    const handleHoverIndex = (i: number | null) => setSelection(i === null ? null : { variable, step: steps[i] })

    return (
        <>
            <ChartFrame title={title} table={table} isFetching={isFetching} className={FLAT_CARD}>
                <SpaghettiChart
                    steps={steps}
                    series={visibleSeries}
                    stats={stats}
                    variable={variable}
                    timeZone={timeZone}
                    locale={locale}
                    accessibilityLabel={summary}
                    hoverIndex={hoverIndex >= 0 ? hoverIndex : null}
                    onHoverIndex={handleHoverIndex}
                    directions={windDirections}
                    now={now}
                    isMedianHidden={isMedianHidden}
                />
                {variable === Variable.Wind && (
                    <Text className="text-xs leading-[1.0625rem] text-muted-foreground">{t('windArrows')}</Text>
                )}
            </ChartFrame>
            <Separator />
            <View className="p-4">
                <ModelLegend
                    series={series}
                    median={stats.median[readoutIndex]}
                    readoutIndex={readoutIndex}
                    readoutLabel={getReadoutLabel(steps[readoutIndex], variable, timeZone, locale)}
                    direction={windDirections?.[readoutIndex] ?? null}
                    variable={variable}
                    hidden={hidden}
                    isMedianHidden={isMedianHidden}
                    onToggleHidden={onToggleHidden}
                    onToggleMedian={onToggleMedian}
                    onReset={onReset}
                />
            </View>
        </>
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
    const { variable, setVariable } = useSelectedVariable()

    const [hidden, setHidden] = useState<ModelId[]>([])
    const [isMedianHidden, setIsMedianHidden] = useState(false)

    const {
        latestQuery,
        precipQuery,
        latest,
        derived,
        summary: summaryValues,
        retry,
    } = useDashboardData(city.slug, variable, { now, locale })

    const info = VARIABLE_BY_ID[variable]
    const timeZone = city.timezone
    // A stable list, so the chart's memoized drawing survives renders that did not hide or show a model.
    const visibleSeries = useMemo(
        () => latest?.series.filter((s) => !hidden.includes(s.modelId)) ?? [],
        [latest, hidden],
    )

    const handleSwitchCity = (slug: string) => {
        setSelectedCity(slug)
        router.replace(`/city/${slug}`)
    }
    const handleReset = () => {
        setHidden([])
        setIsMedianHidden(false)
    }
    const handleToggleHidden = (id: ModelId) => setHidden((list) => toggleItem(list, id))
    const handleToggleMedian = () => setIsMedianHidden((v) => !v)

    if (!latest || !derived || !summaryValues) {
        return (
            <ScreenScroll
                contentContainerStyle={CONTENT_STYLE}
                stickyHeaderIndices={STICKY_INDICES}
                keyboardShouldPersistTaps="handled"
            >
                <CityHeader city={city} onSelectCity={handleSwitchCity} />
                <VariableBar value={variable} onChange={setVariable} />
                {latestQuery.isError || precipQuery.isError ? (
                    <ErrorNotice error={latestQuery.error ?? precipQuery.error} onRetry={retry} />
                ) : (
                    <LoadingStatus label={t('fetching', { name: getCityName(city, locale) })} />
                )}
                <DashboardSkeleton />
            </ScreenScroll>
        )
    }

    const summary = t('summary', { variable: tInline(variable), ...summaryValues })

    return (
        <ScreenScroll
            contentContainerStyle={CONTENT_STYLE}
            stickyHeaderIndices={STICKY_INDICES}
            keyboardShouldPersistTaps="handled"
        >
            <CityHeader city={city} onSelectCity={handleSwitchCity} />
            <VariableBar value={variable} onChange={setVariable} />
            <EdgeSheet>
                <SelectableChart
                    title={tv(variable)}
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
                    steps={latest.steps}
                    series={latest.series}
                    visibleSeries={visibleSeries}
                    stats={derived.stats}
                    directions={derived.directions}
                    variable={variable}
                    timeZone={timeZone}
                    locale={locale}
                    summary={summary}
                    now={now}
                    hidden={hidden}
                    isMedianHidden={isMedianHidden}
                    onToggleHidden={handleToggleHidden}
                    onToggleMedian={handleToggleMedian}
                    onReset={handleReset}
                />
                <Separator />
                <DisagreementTiles days={derived.disagreement} variable={variable} className={FLAT_CARD} />
            </EdgeSheet>
        </ScreenScroll>
    )
}

// The native header names nothing: the body's heading names the place, as on the web, where the top bar has no title.
export function CityScreen() {
    const tCity = useTranslations('city')
    const router = useRouter()
    const { slug } = useLocalSearchParams<{ slug: string }>()

    const { data: city, error, refetch } = useCity(slug)

    // Home opens on the city viewed last, like the web's "Back to overview" link.
    useEffect(() => {
        if (city) setSelectedCity(city.slug)
    }, [city])

    if (error && isNotFound(error)) {
        return (
            <ScreenScroll contentContainerStyle={CONTENT_STYLE} keyboardShouldPersistTaps="handled">
                <SlugHeading slug={slug} />
                <View className="items-center gap-3 py-8">
                    <Text className="text-center text-lg font-semibold">{tCity('notFound')}</Text>
                    <Text className="text-center text-sm text-muted-foreground">{tCity('notFoundBody')}</Text>
                    <View className="self-stretch">
                        <SearchBox onSelectCity={(next) => router.replace(`/city/${next}`)} />
                    </View>
                </View>
            </ScreenScroll>
        )
    }

    if (error) {
        return (
            <ScreenScroll contentContainerStyle={CONTENT_STYLE}>
                <SlugHeading slug={slug} />
                <ErrorNotice error={error} onRetry={() => void refetch()} />
            </ScreenScroll>
        )
    }

    // The header's two lines (name with star and pencil, then Refresh), the switch and the cards.
    if (!city) {
        return (
            <ScreenScroll contentContainerStyle={CONTENT_STYLE} scrollEnabled={false}>
                <View className="gap-2">
                    <SlugHeading slug={slug}>
                        <Skeleton className="size-9" />
                        <Skeleton className="size-9" />
                    </SlugHeading>
                    <Skeleton className="h-9 w-[6.5rem] self-end" />
                </View>
                <Skeleton className="h-9" />
                <DashboardSkeleton />
            </ScreenScroll>
        )
    }

    return <Dashboard city={city} />
}
