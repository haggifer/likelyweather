'use client'

import { ChartFrame } from '@/components/charts/ChartFrame'
import { SpaghettiChart } from '@/components/charts/SpaghettiChart'
import { DisagreementTiles } from '@/components/city/DisagreementTiles'
import { ModelLegend } from '@/components/city/ModelLegend'
import { VariableSwitch } from '@/components/city/VariableSwitch'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNow } from '@/hooks/useNow'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHoverStep } from '@/store/dashboard-slice'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import {
    formatSpread,
    getDashboardStats,
    getFutureRange,
    getReadoutIndex,
    getSlotEnd,
} from '@fa/chart-core/dashboard-stats'
import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatDateKey, formatNumber, formatPeriodLabel, formatStepLabel, getCityName } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface SeriesTableProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
    medianLabel: string
    timeLabel: string
}

// Model columns scroll under the time column, so its background stays opaque: the hover colour is the row's
// muted/50 tint mixed into the card colour instead of laid over it.
const STICKY_TIME_CELL =
    'sticky left-0 z-1 bg-card group-hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))]'

// On phones the switch stays under the top bar, so another variable is one tap away wherever the page is scrolled.
const VARIABLE_BAR = (
    <div
        data-pinned-bar
        className="self-start max-sm:sticky max-sm:top-(--topbar-h) max-sm:z-20 max-sm:-mx-4 max-sm:self-stretch max-sm:bg-background/95 max-sm:px-4 max-sm:py-2 max-sm:backdrop-blur"
    >
        <VariableSwitch className="max-sm:w-full" />
    </div>
)

const getReadoutLabel = (step: string, variable: Variable, timeZone: string, locale: string) =>
    variable === Variable.Precip
        ? formatPeriodLabel(step, getSlotEnd(step), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

const SeriesTable = ({
    steps,
    series,
    stats,
    decimals,
    timeZone,
    locale,
    medianLabel,
    timeLabel,
}: SeriesTableProps) => (
    <Table className="text-xs">
        <TableHeader>
            <TableRow className="group">
                <TableHead className={STICKY_TIME_CELL}>{timeLabel}</TableHead>
                <TableHead className="text-right">{medianLabel}</TableHead>
                {series.map((s) => (
                    <TableHead key={s.modelId} className="text-right">
                        {MODEL_BY_ID[s.modelId].name}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
        <TableBody>
            {steps.map((step, i) => (
                <TableRow key={step} className="group">
                    <TableCell className={`${STICKY_TIME_CELL} whitespace-nowrap`}>
                        {formatStepLabel(step, timeZone, locale)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                        {formatNumber(stats.median[i], decimals)}
                    </TableCell>
                    {series.map((s) => (
                        <TableCell key={s.modelId} className="text-right">
                            {formatNumber(s.values[i], decimals)}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    </Table>
)

interface IProps {
    slug: string
}

export function Dashboard({ slug }: IProps) {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const tInline = useTranslations('variablesInline')
    const locale = useLocale()
    const dispatch = useAppDispatch()
    const now = useNow()
    const { isHydrated } = useUrlSync()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const hoverStep = useAppSelector((s) => s.dashboard.hoverStep)
    const highlighted = useAppSelector((s) => s.dashboard.highlightedModel)
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const isMedianHidden = useAppSelector((s) => s.dashboard.isMedianHidden)

    const { data: city } = useCity(slug)
    const latestQuery = useLatest(slug, variable, isHydrated)
    const precipQuery = useLatest(slug, Variable.Precip, isHydrated)

    const info = VARIABLE_BY_ID[variable]
    const timeZone = city?.timezone ?? 'UTC'
    // The precipitation query is shared by every variable, so its run anchors the chart; a newer run re-anchors it.
    const anchorRun = precipQuery.data ?? latestQuery.data
    const anchor = useMemo(
        () => (city && anchorRun ? getChartStart(anchorRun, city.timezone) : null),
        [city, anchorRun],
    )
    const slots = useMemo(() => (anchor ? buildSlots(anchor, DASHBOARD_HOURS) : null), [anchor])
    const latest = useMemo(
        () => (latestQuery.data && slots ? toSlotLatest(latestQuery.data, slots, info.aggregation) : null),
        [latestQuery.data, slots, info.aggregation],
    )
    const derived = useMemo(
        () => (latest && now ? getDashboardStats(latest, variable, timeZone, now) : null),
        [latest, variable, timeZone, now],
    )
    const chartNow = anchor ? now : null

    if (!city) return null

    const cityName = getCityName(city, locale)

    if (!latest || !derived || !now) {
        return (
            <div className="flex flex-col gap-(--card-gap)">
                {VARIABLE_BAR}
                {latestQuery.isError || precipQuery.isError ? (
                    <ErrorNotice
                        error={latestQuery.error ?? precipQuery.error}
                        onRetry={() => {
                            void latestQuery.refetch()
                            void precipQuery.refetch()
                        }}
                    />
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                        <Loader2 className="size-4 animate-spin" />
                        {t('fetching', { name: cityName })}
                    </div>
                )}
                {/* On phones: the chart card with its model list, then the row of day tiles. */}
                <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_18.75rem]">
                    <Skeleton className="h-[25rem] max-sm:h-[37.5rem]" />
                    <Skeleton className="h-[25rem] max-sm:hidden" />
                </div>
                <Skeleton className="h-[9rem]" />
            </div>
        )
    }

    const visibleSeries = latest.series.filter((s) => !hidden.includes(s.modelId))
    const emphasized: ModelId[] = highlighted ? [highlighted] : []
    const hoverIndex = hoverStep ? latest.steps.indexOf(hoverStep) : -1
    const readoutIndex = getReadoutIndex(latest.steps, hoverIndex, chartNow, info.aggregation === 'sum')
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
    const legend = (
        <ModelLegend
            series={latest.series}
            median={derived.stats.median[readoutIndex]}
            readoutIndex={readoutIndex}
            readoutLabel={getReadoutLabel(latest.steps[readoutIndex], variable, timeZone, locale)}
            direction={variable === Variable.Wind ? (derived.directions?.[readoutIndex] ?? null) : null}
            variable={variable}
        />
    )

    return (
        <div className="flex flex-col gap-(--card-gap)">
            {VARIABLE_BAR}
            <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_20rem]">
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
                            medianLabel={t('median')}
                            timeLabel={t('time')}
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
                        ariaLabel={summary}
                        hoverIndex={hoverIndex >= 0 ? hoverIndex : null}
                        onHoverIndex={(i) => dispatch(setHoverStep(i === null ? null : latest.steps[i]))}
                        emphasized={emphasized}
                        directions={variable === Variable.Wind ? derived.directions : null}
                        now={chartNow}
                        isMedianHidden={isMedianHidden}
                    />
                    {variable === Variable.Wind && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('windArrows')}</p>
                    )}
                    <div className="mt-3 border-t pt-3 sm:hidden">{legend}</div>
                </ChartFrame>
                <div className="rounded-(--radius) border bg-card p-3 max-sm:hidden">{legend}</div>
            </div>
            <DisagreementTiles days={derived.disagreement} variable={variable} />
        </div>
    )
}
