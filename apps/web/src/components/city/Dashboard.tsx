'use client'

import { ChartFrame } from '@/components/charts/ChartFrame'
import { SpaghettiChart } from '@/components/charts/SpaghettiChart'
import { STICKY_CORNER_CELL, STICKY_HEAD_CELL, STICKY_TIME_CELL } from '@/components/charts/table-cells'
import { DisagreementTiles } from '@/components/city/DisagreementTiles'
import { ModelLegend } from '@/components/city/ModelLegend'
import { VariablePairTabs } from '@/components/city/VariablePairTabs'
import { VariableSwitch } from '@/components/city/VariableSwitch'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useIsPhone } from '@/hooks/useIsPhone'
import { useNow } from '@/hooks/useNow'
import { useUrlSync } from '@/hooks/useUrlSync'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHoverStep } from '@/store/dashboard-slice'
import { getReadoutIndex } from '@fa/chart-core/dashboard-stats'
import { useDashboardData } from '@fa/hooks/useDashboardData'
import { Series } from '@fa/shared/api'
import { getReadoutLabel } from '@fa/shared/dashboard'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatTableStepLabel, getCityName } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { getVariablePair, getVariableTab, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { ComponentProps, memo, useDeferredValue, useMemo } from 'react'

interface SeriesTableProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
    medianLabel: string
    timeLabel: string
    // Phones read a pair together, "actual (companion)", whichever sub-tab is open (author, 2026-10-14).
    pairedRuns: PairedRuns | null
    // The median's eye in the legend hides its column too (author, 2026-10-20).
    isMedianHidden: boolean
}

// On phones the switch stays under the top bar, so another variable is one tap away wherever the page is scrolled. Its
// padding is the stuck bar's own background; the negative margins tuck it into the page's gaps, so the buttons keep the
// desktop's 16 px from their neighbours.
const VARIABLE_BAR = (
    <div
        data-pinned-bar
        className="self-start max-sm:sticky max-sm:top-(--topbar-h) max-sm:z-20 max-sm:-mx-4 max-sm:-my-2 max-sm:self-stretch max-sm:bg-background/95 max-sm:px-4 max-sm:py-2 max-sm:backdrop-blur sm:max-w-full"
    >
        <VariableSwitch className="max-w-full max-sm:w-full" />
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
    pairedRuns: PairedRuns | null
}

const HoveredLegend = ({
    steps,
    series,
    stats,
    directions,
    variable,
    timeZone,
    locale,
    now,
    pairedRuns,
}: HoveredLegendProps) => {
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
            pairedRuns={pairedRuns}
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
    pairedRuns,
    isMedianHidden,
}: SeriesTableProps) => (
    <Table className="text-xs max-sm:text-sm">
        <TableHeader>
            <TableRow className="group">
                <TableHead className={STICKY_CORNER_CELL}>{timeLabel}</TableHead>
                {!isMedianHidden && <TableHead className={cn(STICKY_HEAD_CELL, 'text-right')}>{medianLabel}</TableHead>}
                {series.map((s) => (
                    <TableHead key={s.modelId} className={cn(STICKY_HEAD_CELL, 'text-right')}>
                        {MODEL_BY_ID[s.modelId].name}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
        <TableBody>
            {steps.map((step, i) => (
                <TableRow key={step} className="group">
                    <TableCell className={`${STICKY_TIME_CELL} whitespace-nowrap`}>
                        {formatTableStepLabel(step, timeZone, locale)}
                    </TableCell>
                    {!isMedianHidden && (
                        <TableCell className="text-right font-semibold">
                            {pairedRuns
                                ? formatPairedMedian(pairedRuns, i, decimals)
                                : formatNumber(stats.median[i], decimals)}
                        </TableCell>
                    )}
                    {series.map((s) => (
                        <TableCell key={s.modelId} className="text-right">
                            {pairedRuns
                                ? formatPairedModel(pairedRuns, s.modelId, i, decimals)
                                : formatNumber(s.values[i], decimals)}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    </Table>
)

interface ViewProps {
    slug: string
    variable: Variable
    isHydrated: boolean
}

// Memoized, so a tap on the switch re-renders only the switch at once; the view follows with the deferred variable.
const DashboardView = memo(function DashboardView({ slug, variable, isHydrated }: ViewProps) {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const tInline = useTranslations('variablesInline')
    const tTabs = useTranslations('variableTabs')
    const tc = useTranslations('chart')
    const locale = useLocale()
    const now = useNow()
    // The legend follows every hover, so only the copy for this width is rendered, not a second one hidden by CSS.
    const isPhone = useIsPhone()
    const highlighted = useAppSelector((s) => s.dashboard.highlightedModel)
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const isMedianHidden = useAppSelector((s) => s.dashboard.isMedianHidden)

    const {
        city,
        latestQuery,
        precipQuery,
        latest,
        shown,
        hasData,
        derived,
        summary: summaryValues,
        pairedRuns: allPairedRuns,
        retry,
    } = useDashboardData(slug, variable, {
        now,
        locale,
        isEnabled: isHydrated,
        hiddenModels: hidden,
    })

    const info = VARIABLE_BY_ID[variable]
    const timeZone = city?.timezone ?? 'UTC'
    const pairedRuns = isPhone ? allPairedRuns : null
    const emptyMessage = hasData ? null : tc('noData')
    // Phones name a pair once ("Temperature") and show which member is open in the sub-tabs.
    const title = isPhone && getVariablePair(variable) ? tTabs(getVariableTab(variable)) : tv(variable)
    // A stable list, so the chart's memoized drawing survives renders that did not change the highlighted model.
    const emphasized = useMemo<ModelId[]>(() => (highlighted ? [highlighted] : []), [highlighted])

    if (!city) return null

    const cityName = getCityName(city, locale)

    if (!latest || !shown || !derived || !summaryValues || !now) {
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
                <div className="flex flex-col gap-(--card-gap) lg:flex-row">
                    <Skeleton className="h-[25rem] max-sm:h-[37.5rem] lg:min-w-0 lg:flex-1" />
                    <Skeleton className="h-[25rem] max-sm:hidden lg:w-[18.75rem] lg:shrink-0" />
                </div>
                <Skeleton className="h-[9rem]" />
            </div>
        )
    }

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
            pairedRuns={pairedRuns}
        />
    )

    return (
        <div className="flex flex-col gap-(--card-gap)">
            {VARIABLE_BAR}
            {/* On phones the cards join into one edge-to-edge sheet (`data-sheet`, globals.css) parted by dividers, like
                the landing's card. */}
            <div data-sheet className="flex flex-col gap-(--card-gap) max-sm:-mx-4 max-sm:gap-0">
                <div className="flex flex-col gap-(--card-gap) max-sm:gap-0 lg:flex-row">
                    <ChartFrame
                        className="lg:min-w-0 lg:flex-1"
                        title={title}
                        tabs={isPhone ? <VariablePairTabs /> : undefined}
                        isFetching={latestQuery.isFetching && latestQuery.isPlaceholderData}
                        emptyMessage={emptyMessage}
                        table={
                            <SeriesTable
                                steps={latest.steps}
                                series={shown.series}
                                stats={derived.stats}
                                decimals={info.decimals}
                                timeZone={timeZone}
                                locale={locale}
                                medianLabel={t('median')}
                                timeLabel={t('time')}
                                pairedRuns={pairedRuns}
                                isMedianHidden={isMedianHidden}
                            />
                        }
                    >
                        <HoveredChart
                            steps={latest.steps}
                            series={shown.series}
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
                        {/* Phones go without the note (author, 2026-10-14): the legend names the direction. */}
                        {variable === Variable.Wind && (
                            <p className="mt-1 text-xs text-muted-foreground max-sm:hidden">{t('windArrows')}</p>
                        )}
                    </ChartFrame>
                    {isPhone ? (
                        <>
                            <Separator />
                            <div className="p-4">{legend}</div>
                        </>
                    ) : (
                        <div className="rounded-(--radius) border bg-card p-3 lg:w-80 lg:shrink-0">{legend}</div>
                    )}
                </div>
                <Separator className="sm:hidden" />
                <DisagreementTiles days={derived.disagreement} variable={variable} emptyMessage={emptyMessage} />
            </div>
        </div>
    )
})

interface IProps {
    slug: string
}

// The switch shows a tap at once; the dashboard redraws for it in the background and its chart fades until it has
// (`data-switching`, the author's lag report of 2026-10-14).
export function Dashboard({ slug }: IProps) {
    const { isHydrated } = useUrlSync()
    const selectedVariable = useAppSelector((s) => s.dashboard.variable)

    const variable = useDeferredValue(selectedVariable)

    return (
        <div data-switching={variable !== selectedVariable || undefined} className="contents">
            <DashboardView slug={slug} variable={variable} isHydrated={isHydrated} />
        </div>
    )
}
