'use client'

import { ChartFrame } from '@/components/charts/ChartFrame'
import { SpaghettiChart } from '@/components/charts/SpaghettiChart'
import { DisagreementTiles } from '@/components/city/DisagreementTiles'
import { ModelLegend } from '@/components/city/ModelLegend'
import { VariableSwitch } from '@/components/city/VariableSwitch'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHoverStep } from '@/store/dashboard-slice'
import { getReadoutIndex } from '@fa/chart-core/dashboard-stats'
import { useDashboardData } from '@fa/hooks/useDashboardData'
import { Series } from '@fa/shared/api'
import { getReadoutLabel } from '@fa/shared/dashboard'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatStepLabel, getCityName } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { ComponentProps, useMemo } from 'react'

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

const PHONE_QUERY = '(width < 40rem)'

// On phones the switch stays under the top bar, so another variable is one tap away wherever the page is scrolled.
const VARIABLE_BAR = (
    <div
        data-pinned-bar
        className="self-start max-sm:sticky max-sm:top-(--topbar-h) max-sm:z-20 max-sm:-mx-4 max-sm:self-stretch max-sm:bg-background/95 max-sm:px-4 max-sm:py-2 max-sm:backdrop-blur"
    >
        <VariableSwitch className="max-sm:w-full" />
    </div>
)

const toHoverIndex = (steps: string[], hoverStep: string | null) => (hoverStep ? steps.indexOf(hoverStep) : -1)

type HoveredChartProps = Omit<ComponentProps<typeof SpaghettiChart>, 'hoverIndex' | 'onHoverIndex'>

// Only the chart and the legend read the hovered step, so a pointer move re-renders them and not the whole dashboard
// (the tiles, the frame, the other legend), which made a hover cost 50–100 ms on a slow CPU.
const HoveredChart = (props: HoveredChartProps) => {
    const dispatch = useAppDispatch()
    const hoverStep = useAppSelector((s) => s.dashboard.hoverStep)

    const hoverIndex = toHoverIndex(props.steps, hoverStep)

    return (
        <SpaghettiChart
            {...props}
            hoverIndex={hoverIndex >= 0 ? hoverIndex : null}
            onHoverIndex={(i) => dispatch(setHoverStep(i === null ? null : props.steps[i]))}
        />
    )
}

interface HoveredLegendProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    directions: (number | null)[] | null
    variable: Variable
    timeZone: string
    locale: string
    now: Date | null
}

const HoveredLegend = ({ steps, series, stats, directions, variable, timeZone, locale, now }: HoveredLegendProps) => {
    const hoverStep = useAppSelector((s) => s.dashboard.hoverStep)

    const isSum = VARIABLE_BY_ID[variable].aggregation === 'sum'
    const readoutIndex = getReadoutIndex(steps, toHoverIndex(steps, hoverStep), now, isSum)

    return (
        <ModelLegend
            series={series}
            median={stats.median[readoutIndex]}
            readoutIndex={readoutIndex}
            readoutLabel={getReadoutLabel(steps[readoutIndex], variable, timeZone, locale)}
            direction={variable === Variable.Wind ? (directions?.[readoutIndex] ?? null) : null}
            variable={variable}
        />
    )
}

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
    const now = useNow()
    // The legend follows every hover, so only the copy for this width is rendered, not a second one hidden by CSS.
    const isPhone = useMediaQuery(PHONE_QUERY)
    const { isHydrated } = useUrlSync()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const highlighted = useAppSelector((s) => s.dashboard.highlightedModel)
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const isMedianHidden = useAppSelector((s) => s.dashboard.isMedianHidden)

    const {
        city,
        latestQuery,
        precipQuery,
        latest,
        derived,
        summary: summaryValues,
        retry,
    } = useDashboardData(slug, variable, {
        now,
        locale,
        isEnabled: isHydrated,
    })

    const info = VARIABLE_BY_ID[variable]
    const timeZone = city?.timezone ?? 'UTC'
    // A stable list, so the chart's memoized drawing survives renders that did not change the highlighted model.
    const emphasized = useMemo<ModelId[]>(() => (highlighted ? [highlighted] : []), [highlighted])

    if (!city) return null

    const cityName = getCityName(city, locale)

    if (!latest || !derived || !summaryValues || !now) {
        return (
            <div className="flex flex-col gap-(--card-gap)">
                {VARIABLE_BAR}
                {latestQuery.isError || precipQuery.isError ? (
                    <ErrorNotice error={latestQuery.error ?? precipQuery.error} onRetry={retry} />
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
    const summary = t('summary', { variable: tInline(variable), ...summaryValues })
    const legend = (
        <HoveredLegend
            steps={latest.steps}
            series={latest.series}
            stats={derived.stats}
            directions={derived.directions}
            variable={variable}
            timeZone={timeZone}
            locale={locale}
            now={now}
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
                    <HoveredChart
                        steps={latest.steps}
                        series={visibleSeries}
                        stats={derived.stats}
                        variable={variable}
                        timeZone={timeZone}
                        locale={locale}
                        ariaLabel={summary}
                        emphasized={emphasized}
                        directions={variable === Variable.Wind ? derived.directions : null}
                        now={now}
                        isMedianHidden={isMedianHidden}
                    />
                    {variable === Variable.Wind && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('windArrows')}</p>
                    )}
                    {isPhone && <div className="mt-3 border-t pt-3 sm:hidden">{legend}</div>}
                </ChartFrame>
                {!isPhone && <div className="rounded-(--radius) border bg-card p-3 max-sm:hidden">{legend}</div>}
            </div>
            <DisagreementTiles days={derived.disagreement} variable={variable} />
        </div>
    )
}
