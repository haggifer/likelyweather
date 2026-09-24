'use client'

import ChartFrame from '@/charts/ChartFrame'
import PrecipPanel from '@/charts/PrecipPanel'
import SpaghettiChart from '@/charts/SpaghettiChart'
import { getNearestIndex } from '@/charts/spaghettiGeometry'
import DisagreementTiles from '@/components/city/DisagreementTiles'
import ModelLegend from '@/components/city/ModelLegend'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCity, useLatest } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import useUrlSync from '@/hooks/useUrlSync'
import { formatNumber, formatStepLabel, formatTime, formatUtc, getCityName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Series } from '@/shared/api'
import {
    computeChanceOfRain,
    computeDisagreement,
    computeEnsemble,
    computeMedianDirection,
    EnsembleStats,
} from '@/shared/ensemble'
import { MODEL_BY_ID, ModelId, MODELS } from '@/shared/models'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHoverStep, toggleHiddenModel } from '@/store/dashboardSlice'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
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
    const legendPlacement = useAppSelector((s) => s.layout.legendPlacement)
    const { data: city } = useCity(slug)
    const latestQuery = useLatest(slug, variable, isHydrated)
    const precipQuery = useLatest(slug, Variable.Precip, isHydrated)
    const latest = latestQuery.data
    const info = VARIABLE_BY_ID[variable]
    const timeZone = city?.timezone ?? 'UTC'

    const derived = useMemo(() => {
        if (!latest || !now) return null

        const values = latest.series.map((s) => s.values)
        const stats = computeEnsemble(values, latest.steps.length)

        return {
            stats,
            disagreement: computeDisagreement(latest.steps, values, variable, timeZone, now),
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

        if (!data || !now) return null

        const firstFuture = data.steps.findIndex((s) => new Date(s) > now)
        const steps = data.steps.slice(firstFuture)
        const series = data.series.map((s) => ({ ...s, values: s.values.slice(firstFuture) }))
        const values = series.map((s) => s.values)

        return {
            steps,
            series,
            median: computeEnsemble(values, steps.length).median,
            chance: computeChanceOfRain(values, steps.length),
        }
    }, [precipQuery.data, now])

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
            : getNearestIndex(
                  latest.steps.map((s) => new Date(s)),
                  now,
              )
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
            readoutLabel={formatStepLabel(latest.steps[readoutIndex], timeZone, locale)}
            variable={variable}
            placement={legendPlacement}
        />
    )

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div
                className={cn(
                    'grid gap-(--card-gap)',
                    legendPlacement === 'side' && 'lg:grid-cols-[minmax(0,1fr)_320px]',
                )}
            >
                <ChartFrame
                    title={t('chartTitle', { variable: tv(variable), count: latest.series.length })}
                    description={t('chartDescription', {
                        issue: formatUtc(latest.issueTime, locale),
                        origin: t(`origin.${latest.origin}`),
                    })}
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
                    footer={legendPlacement === 'under' ? legend : undefined}
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
                        now={now}
                    />
                    {variable === Variable.Wind && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('windArrows')}</p>
                    )}
                </ChartFrame>
                {legendPlacement === 'side' && <div className="rounded-(--radius) border bg-card p-3">{legend}</div>}
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
                    {precip ? (
                        <PrecipPanel
                            steps={precip.steps}
                            series={precip.series}
                            median={precip.median}
                            chance={precip.chance}
                            timeZone={timeZone}
                            locale={locale}
                        />
                    ) : (
                        <Skeleton className="h-[230px]" />
                    )}
                </ChartFrame>
            </div>
        </div>
    )
}
