'use client'

import ChartFrame from '@/charts/ChartFrame'
import SpaghettiChart from '@/charts/SpaghettiChart'
import { getNearestIndex } from '@/charts/spaghettiGeometry'
import DisagreementTiles from '@/components/city/DisagreementTiles'
import ModelLegend from '@/components/city/ModelLegend'
import VariableSwitch from '@/components/city/VariableSwitch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCity, useLatest } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import useUrlSync from '@/hooks/useUrlSync'
import { formatNumber, formatPeriodLabel, formatStepLabel, formatTime, getCityName } from '@/lib/format'
import { Series } from '@/shared/api'
import {
    computeChanceOfRain,
    computeDisagreement,
    computeEnsemble,
    computeMedianDirection,
    EnsembleStats,
} from '@/shared/ensemble'
import { MODEL_BY_ID, ModelId, MODELS } from '@/shared/models'
import { indexSteps, toStepSeries } from '@/shared/resample'
import { buildSlots, DASHBOARD_HOURS, getSlotStart, SLOT_HOURS, toSlotLatest } from '@/shared/slots'
import { addHours, toIsoMinute } from '@/shared/time'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHoverStep, toggleHiddenModel } from '@/store/dashboardSlice'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'

interface IProps {
    slug: string
}

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

const PRECIP_WINDOW_HOURS = 6

// Recharts is the heaviest chart library here and the panel sits below the fold, so it loads after the main chart.
const PrecipPanel = dynamic(() => import('@/charts/PrecipPanel'), {
    ssr: false,
    loading: () => <Skeleton className="h-[230px]" />,
})

const isTypingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export const SeriesTable = ({
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
            <TableRow>
                <TableHead>{timeLabel}</TableHead>
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
                <TableRow key={step}>
                    <TableCell className="whitespace-nowrap">{formatStepLabel(step, timeZone, locale)}</TableCell>
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

export default function Dashboard({ slug }: IProps) {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const locale = useLocale()
    const dispatch = useAppDispatch()
    const now = useNow()
    const { isHydrated } = useUrlSync()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const hoverStep = useAppSelector((s) => s.dashboard.hoverStep)
    const highlighted = useAppSelector((s) => s.dashboard.highlightedModel)
    const pinned = useAppSelector((s) => s.dashboard.pinnedModels)
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const { data: city } = useCity(slug)
    const latestQuery = useLatest(slug, variable, isHydrated)
    const precipQuery = useLatest(slug, Variable.Precip, isHydrated)
    const info = VARIABLE_BY_ID[variable]
    const timeZone = city?.timezone ?? 'UTC'
    // Like the landing overview, the chart starts at the local 3-hour slot the data arrived in. The precipitation
    // query is shared by every variable, so its arrival time anchors the chart and each refetch re-anchors it.
    const receivedAt = precipQuery.dataUpdatedAt || latestQuery.dataUpdatedAt
    const anchor = useMemo(
        () => (city && receivedAt ? getSlotStart(new Date(receivedAt), city.timezone) : null),
        [city, receivedAt],
    )
    const slots = useMemo(() => (anchor ? buildSlots(anchor, DASHBOARD_HOURS) : null), [anchor])
    const latest = useMemo(
        () => (latestQuery.data && slots ? toSlotLatest(latestQuery.data, slots, info.aggregation) : null),
        [latestQuery.data, slots, info.aggregation],
    )
    const chartNow = now && anchor && getSlotStart(now, timeZone) > anchor ? now : null

    const derived = useMemo(() => {
        if (!latest || !now) return null

        const values = latest.series.map((s) => s.values)
        const stats = computeEnsemble(values, latest.steps.length)

        // A slot's precipitation covers the 3 hours after it; computeDisagreement files a sum under the day it ends.
        const disagreementSteps =
            variable === Variable.Precip
                ? latest.steps.map((s) => toIsoMinute(addHours(new Date(s), SLOT_HOURS)))
                : latest.steps

        return {
            stats,
            disagreement: computeDisagreement(disagreementSteps, values, variable, timeZone, now),
            directions: latest.directions
                ? computeMedianDirection(
                      latest.directions.map((d) => d.values),
                      latest.steps.length,
                  )
                : null,
        }
    }, [latest, variable, timeZone, now])

    const precip = useMemo(() => {
        const data = precipQuery.data

        if (!data || !anchor) return null

        // 6-hour totals from the chart start, each labelled by the hour it ends, so the labels stay on the 3-hour grid.
        const steps = Array.from({ length: DASHBOARD_HOURS / PRECIP_WINDOW_HOURS }, (_, k) =>
            toIsoMinute(addHours(anchor, (k + 1) * PRECIP_WINDOW_HOURS)),
        )
        const timeIndex = indexSteps(data.steps)
        const series = data.series.map((s) => ({
            modelId: s.modelId,
            values: toStepSeries(timeIndex, s.values, steps, 'sum', PRECIP_WINDOW_HOURS),
        }))
        const values = series.map((s) => s.values)

        return {
            steps,
            series,
            median: computeEnsemble(values, steps.length).median,
            chance: computeChanceOfRain(values, steps.length),
        }
    }, [precipQuery.data, anchor])

    // The precipitation panel does not depend on the selected variable; a stable element keeps a variable switch
    // from re-rendering the Recharts tree.
    const precipChart = useMemo(
        () =>
            precip ? (
                <PrecipPanel
                    steps={precip.steps}
                    series={precip.series}
                    median={precip.median}
                    chance={precip.chance}
                    timeZone={timeZone}
                    locale={locale}
                    windowHours={PRECIP_WINDOW_HOURS}
                />
            ) : (
                <Skeleton className="h-[230px]" />
            ),
        [precip, timeZone, locale],
    )

    useEffect(() => {
        const available = new Set(latest?.series.map((s) => s.modelId))
        const handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return

            const model = MODELS.find((m) => m.hotkey === e.key && available.has(m.id))

            if (model) dispatch(toggleHiddenModel(model.id))
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [latest, dispatch])

    if (!city) return null

    const cityName = getCityName(city, locale)

    if (!latest || !derived || !now) {
        return (
            <div className="flex flex-col gap-(--card-gap)">
                <VariableSwitch className="self-start" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin" />
                    {latestQuery.isError
                        ? t('fetchFailed', { message: latestQuery.error.message })
                        : t('fetching', { name: cityName })}
                </div>
                <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_300px]">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
                <div className="grid gap-(--card-gap) lg:grid-cols-2">
                    <Skeleton className="h-[220px]" />
                    <Skeleton className="h-[220px]" />
                </div>
            </div>
        )
    }

    const visibleSeries = latest.series.filter((s) => !hidden.includes(s.modelId))
    const emphasized: ModelId[] = [...pinned, ...(highlighted ? [highlighted] : [])]
    const hoverIndex = hoverStep ? latest.steps.indexOf(hoverStep) : -1
    const readoutIndex =
        hoverIndex >= 0
            ? hoverIndex
            : chartNow
              ? getNearestIndex(
                    latest.steps.map((s) => new Date(s)),
                    chartNow,
                )
              : 0
    const futureMedian = derived.stats.median
        .filter((_, i) => new Date(latest.steps[i]) > now)
        .filter((v): v is number => v !== null)
    const mostSplit = [...derived.disagreement].sort((a, b) => b.spread - a.spread)[0]
    const summary = t('summary', {
        variable: tv(variable).toLowerCase(),
        count: latest.series.length,
        min: formatNumber(futureMedian.length ? Math.min(...futureMedian) : null, info.decimals),
        max: formatNumber(futureMedian.length ? Math.max(...futureMedian) : null, info.decimals),
        unit: info.unit,
        day: mostSplit ? formatTime(`${mostSplit.day}T12:00:00Z`, 'UTC', locale, { weekday: 'long' }) : '–',
        spread: formatNumber(mostSplit?.spread, info.decimals === 0 ? 1 : info.decimals),
    })
    const legend = (
        <ModelLegend
            series={latest.series}
            median={derived.stats.median[readoutIndex]}
            readoutIndex={readoutIndex}
            readoutLabel={
                variable === Variable.Precip
                    ? formatPeriodLabel(
                          latest.steps[readoutIndex],
                          toIsoMinute(addHours(new Date(latest.steps[readoutIndex]), SLOT_HOURS)),
                          timeZone,
                          locale,
                      )
                    : formatStepLabel(latest.steps[readoutIndex], timeZone, locale)
            }
            variable={variable}
        />
    )

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <VariableSwitch className="self-start" />
            <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_320px]">
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
                    />
                    {variable === Variable.Wind && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('windArrows')}</p>
                    )}
                </ChartFrame>
                <div className="rounded-(--radius) border bg-card p-3">{legend}</div>
            </div>
            <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <DisagreementTiles days={derived.disagreement} variable={variable} />
                <ChartFrame
                    title={t('precipTitle')}
                    description={t('precipDescription')}
                    summary={
                        precip
                            ? t('precipSummary', {
                                  steps: precip.chance.filter((c) => (c ?? 0) >= 0.5).length,
                                  total: formatNumber(
                                      precip.median.reduce<number>((sum, v) => sum + (v ?? 0), 0),
                                      1,
                                  ),
                              })
                            : undefined
                    }
                >
                    {precipChart}
                </ChartFrame>
            </div>
        </div>
    )
}
