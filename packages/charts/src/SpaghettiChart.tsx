'use client'

import { clamp, getBarWidth, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import {
    buildSpaghettiGeometry,
    getNearestIndex,
    getSpanIndex,
    getSumBarCenter,
    getSumSpan,
    Margin,
} from '@fa/chart-core/spaghetti-geometry'
import { Series } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatPeriodLabel, formatStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useNow } from '@fa/ui/hooks/useNow'
import { ScaleTime } from 'd3-scale'
import { useTranslations } from 'next-intl'
import { KeyboardEvent, PointerEvent, useId, useMemo } from 'react'
import { getArrowStep } from './arrow-keys'
import { DayGrid } from './DayGrid'
import { useAnimatedDomain } from './hooks/useAnimatedDomain'
import { useChartTheme } from './hooks/useChartTheme'
import { useElementWidth } from './hooks/useElementWidth'
import { getPointerTime } from './pointer-time'
import { WindArrows } from './WindArrows'

interface DrawnBar {
    i: number
    center: number
}

interface TooltipRow {
    modelId: ModelId
    value: number
}

const ARROW_ROW = 26
const MAX_TICK_WIDTH = 16
const HOVER_LABEL_HALF_WIDTH = 34
const PERIOD_LABEL_HALF_WIDTH = 50
const UNIT_LABEL_WIDTH = 28
// Phones get a shorter plot so the model list under it stays in view while scrubbing.
const NARROW_WIDTH = 480
const NARROW_HEIGHT = 280

const getMargin = (compact: boolean, hasArrows: boolean): Margin => ({
    top: compact ? 14 : 24,
    right: 12,
    bottom: (compact ? 22 : 30) + (hasArrows ? ARROW_ROW : 0),
    left: compact ? 34 : 44,
})

const getSeriesYDomain = (series: Series[], variable: Variable) =>
    getYDomain(
        series.flatMap((s) => s.values),
        variable,
    )

// Bars that would overflow the plot are not drawn.
const getDrawnBars = (
    times: Date[],
    x: ScaleTime<number, number>,
    stepMs: number,
    barWidth: number,
    [left, right]: [number, number],
): DrawnBar[] =>
    times
        .map((time, i) => ({ i, center: x(getSumBarCenter(time, stepMs)) }))
        .filter(({ center }) => center - barWidth / 2 >= left && center + barWidth / 2 <= right)

const getHoverLabel = (step: string, span: [Date, Date] | null, timeZone: string, locale: string) =>
    span
        ? formatPeriodLabel(span[0].toISOString(), span[1].toISOString(), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

const getTooltipRows = (series: Series[], index: number) =>
    series
        .map((s) => ({ modelId: s.modelId, value: s.values[index] }))
        .filter((r): r is TooltipRow => r.value !== null)
        .sort((a, b) => b.value - a.value)

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    variable: Variable
    timeZone: string
    locale: string
    ariaLabel: string
    hoverIndex: number | null
    onHoverIndex?: (index: number | null) => void
    emphasized?: ModelId[]
    directions?: (number | null)[] | null
    height?: number
    compact?: boolean
    showTooltip?: boolean
    yDomain?: [number, number]
    now?: Date | null
    isMedianHidden?: boolean
}

export function SpaghettiChart({
    steps,
    series,
    stats,
    variable,
    timeZone,
    locale,
    ariaLabel,
    hoverIndex,
    onHoverIndex,
    emphasized = [],
    directions,
    height: heightProp = 340,
    compact = false,
    showTooltip = false,
    yDomain,
    now: nowProp,
    isMedianHidden = false,
}: IProps) {
    const t = useTranslations('chart')
    const theme = useChartTheme()
    const liveNow = useNow()
    const clipId = useId().replace(/[^\w-]/g, '')

    const { ref, width } = useElementWidth<HTMLDivElement>()

    const now = nowProp === undefined ? liveNow : nowProp
    const height = width < NARROW_WIDTH ? Math.min(heightProp, NARROW_HEIGHT) : heightProp
    const info = VARIABLE_BY_ID[variable]
    const isBars = variable === Variable.Precip
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getMargin(compact, hasArrows), [compact, hasArrows])
    const target = useMemo(() => yDomain ?? getSeriesYDomain(series, variable), [yDomain, series, variable])
    const domain = useAnimatedDomain(target, variable)
    const geometry = useMemo(
        () => buildSpaghettiGeometry({ steps, series, stats, width, height, domain, margin }),
        [steps, series, stats, width, height, domain, margin],
    )

    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const plotRight = width - margin.right
    const nowX = getNowX(x, now, margin.left, plotRight)
    const yTicks = getYTicks(domain, variable, compact ? 3 : 5)
    const stepMs = times.length > 1 ? times[1].getTime() - times[0].getTime() : 3 * HOUR_MS
    const barWidth = getBarWidth(x, times[0], stepMs)
    const tickWidth = Math.min(barWidth, MAX_TICK_WIDTH)
    const bars = isBars ? getDrawnBars(times, x, stepMs, barWidth, [margin.left, plotRight]) : []
    // Hovering and stepping stay within the drawn bars.
    const minIndex = isBars && bars.length ? bars[0].i : 0
    const maxIndex = isBars && bars.length ? bars[bars.length - 1].i : times.length - 1
    const hover = hoverIndex !== null && times[hoverIndex] ? hoverIndex : null
    // A sum is hovered as the period it covers: shaded across, labelled with its start and end.
    const hoverSpan = hover !== null && isBars ? getSumSpan(times[hover], stepMs) : null
    const hoverTime = hover === null ? null : hoverSpan ? getSumBarCenter(times[hover], stepMs) : times[hover]
    const hoverX = hoverTime ? x(hoverTime) : null
    const hoverLabel = hover === null ? null : getHoverLabel(steps[hover], hoverSpan, timeZone, locale)
    const labelHalfWidth = hoverSpan ? PERIOD_LABEL_HALF_WIDTH : HOVER_LABEL_HALF_WIDTH
    const hoverLabelX =
        hoverX === null
            ? null
            : clamp(hoverX, margin.left + UNIT_LABEL_WIDTH + labelHalfWidth, plotRight - labelHalfWidth)
    const spanLeft = hoverSpan ? Math.max(margin.left, x(hoverSpan[0])) : 0
    const spanRight = hoverSpan ? Math.min(plotRight, x(hoverSpan[1])) : 0
    const tooltipRows = hover !== null ? getTooltipRows(series, hover) : []
    const isDimmed = (id: ModelId) => emphasized.length > 0 && !emphasized.includes(id)

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        const at = getPointerTime(e, x, margin.left)
        const index = isBars ? getSpanIndex(times, at, stepMs) : getNearestIndex(times, at)

        onHoverIndex?.(clamp(index, minIndex, maxIndex))
    }

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        const step = getArrowStep(e.key)

        if (!step) return

        const at = now ?? times[0]
        const current = hoverIndex ?? (isBars ? getSpanIndex(times, at, stepMs) : getNearestIndex(times, at))

        e.preventDefault()
        onHoverIndex?.(clamp(current + step, minIndex, maxIndex))
    }

    return (
        <div ref={ref} className="relative w-full select-none">
            <svg
                width={width}
                height={height}
                role="img"
                aria-label={ariaLabel}
                tabIndex={onHoverIndex ? 0 : -1}
                onKeyDown={handleKeyDown}
                onBlur={() => onHoverIndex?.(null)}
                className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {nowX !== null && (
                    <rect
                        x={margin.left}
                        y={margin.top}
                        width={Math.max(0, nowX - margin.left)}
                        height={plotBottom - margin.top}
                        fill={theme.grid}
                        opacity={0.45}
                    />
                )}
                {yTicks.map((tick) => (
                    <g key={tick}>
                        <line x1={margin.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={theme.grid} />
                        <text
                            x={margin.left - 6}
                            y={y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                            fontSize={compact ? 10 : 11}
                            fill={theme.muted}
                        >
                            {formatYTick(tick, info.decimals === 0)}
                        </text>
                    </g>
                ))}
                <DayGrid
                    x={x}
                    start={times[0]}
                    end={times[times.length - 1]}
                    timeZone={timeZone}
                    locale={locale}
                    spans={[{ top: margin.top, bottom: plotBottom }]}
                    labelYs={[plotBottom + (compact ? 15 : 18)]}
                    lineColor={theme.border}
                    labelColor={theme.muted}
                    fontSize={compact ? 10 : 11}
                />
                {!compact && (
                    <text x={margin.left} y={margin.top - 8} fontSize={10} fill={theme.muted}>
                        {info.unit}
                    </text>
                )}
                <defs>
                    <clipPath id={clipId}>
                        <rect
                            x={margin.left}
                            y={margin.top}
                            width={Math.max(0, plotRight - margin.left)}
                            height={Math.max(0, plotBottom - margin.top)}
                        />
                    </clipPath>
                </defs>
                {/* The bands and median span every model while the y-domain fits the visible ones, so a hidden
                    outlier's band is cut at the plot edge instead of covering the card header. */}
                <g clipPath={`url(#${clipId})`}>
                    {!isBars && <path d={geometry.outerBand} fill={theme.band} opacity={theme.bandOuterOpacity} />}
                    {!isBars && <path d={geometry.innerBand} fill={theme.band} opacity={theme.bandInnerOpacity} />}
                    {hoverSpan && (
                        <rect
                            x={spanLeft}
                            y={margin.top}
                            width={Math.max(0, spanRight - spanLeft)}
                            height={plotBottom - margin.top}
                            fill={theme.grid}
                            opacity={0.8}
                            pointerEvents="none"
                        />
                    )}
                    {bars.map(({ i, center }) => {
                        const median = stats.median[i]

                        return (
                            <g key={times[i].toISOString()}>
                                {median !== null && !isMedianHidden && (
                                    <rect
                                        x={center - barWidth / 2}
                                        y={y(median)}
                                        width={barWidth}
                                        height={Math.max(0, plotBottom - y(median))}
                                        rx={2}
                                        fill={theme.band}
                                        opacity={hover === i ? 0.95 : 0.6}
                                    />
                                )}
                                {series.map((s) => {
                                    const v = s.values[i]

                                    if (v === null) return null

                                    return (
                                        <line
                                            key={s.modelId}
                                            x1={center - tickWidth / 2}
                                            x2={center + tickWidth / 2}
                                            y1={y(v)}
                                            y2={y(v)}
                                            stroke={MODEL_BY_ID[s.modelId].color}
                                            strokeWidth={emphasized.includes(s.modelId) ? 3 : 2}
                                            strokeDasharray={MODEL_BY_ID[s.modelId].dash}
                                            strokeLinecap={MODEL_BY_ID[s.modelId].dash ? 'butt' : 'round'}
                                            opacity={isDimmed(s.modelId) ? 0.15 : 0.9}
                                        />
                                    )
                                })}
                            </g>
                        )
                    })}
                    {!isBars &&
                        geometry.lines.map(({ modelId, d }) => (
                            <path
                                key={modelId}
                                d={d}
                                fill="none"
                                stroke={MODEL_BY_ID[modelId].color}
                                strokeWidth={emphasized.includes(modelId) ? 2.5 : 1.5}
                                strokeDasharray={MODEL_BY_ID[modelId].dash}
                                strokeLinecap={MODEL_BY_ID[modelId].dash ? 'butt' : 'round'}
                                opacity={isDimmed(modelId) ? 0.15 : 0.9}
                            />
                        ))}
                    {!isBars && !isMedianHidden && (
                        <path
                            d={geometry.median}
                            fill="none"
                            stroke={theme.median}
                            strokeWidth={3}
                            strokeLinecap="round"
                        />
                    )}
                </g>
                {nowX !== null && (
                    <g>
                        <line
                            x1={nowX}
                            x2={nowX}
                            y1={margin.top}
                            y2={plotBottom}
                            stroke={theme.foreground}
                            strokeDasharray="4 3"
                        />
                        <text x={nowX + 4} y={margin.top + 10} fontSize={10} fontWeight={600} fill={theme.foreground}>
                            {t('now')}
                        </text>
                    </g>
                )}
                {directions && (
                    <WindArrows
                        x={x}
                        times={times}
                        directions={directions}
                        y={height - ARROW_ROW / 2 - 2}
                        color={theme.foreground}
                        mutedColor={theme.muted}
                        compassLabels={t('compass').split(',')}
                    />
                )}
                {hover !== null && hoverX !== null && (
                    <g pointerEvents="none">
                        {!isBars && (
                            <line x1={hoverX} x2={hoverX} y1={margin.top} y2={plotBottom} stroke={theme.muted} />
                        )}
                        {!compact && hoverLabelX !== null && (
                            <text
                                x={hoverLabelX}
                                y={margin.top - 8}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={600}
                                fill={theme.foreground}
                            >
                                {hoverLabel}
                            </text>
                        )}
                        {!isBars &&
                            series.map((s) => {
                                const v = s.values[hover]

                                if (v === null || isDimmed(s.modelId)) return null

                                return (
                                    <circle
                                        key={s.modelId}
                                        cx={hoverX}
                                        cy={y(v)}
                                        r={3.5}
                                        fill={MODEL_BY_ID[s.modelId].color}
                                        stroke={theme.card}
                                        strokeWidth={2}
                                    />
                                )
                            })}
                        {!isBars && !isMedianHidden && stats.median[hover] !== null && (
                            <circle
                                cx={hoverX}
                                cy={y(stats.median[hover]!)}
                                r={4.5}
                                fill={theme.median}
                                stroke={theme.card}
                                strokeWidth={2}
                            />
                        )}
                    </g>
                )}
                {onHoverIndex && (
                    <rect
                        x={margin.left}
                        y={margin.top}
                        width={Math.max(0, width - margin.left - margin.right)}
                        height={Math.max(0, plotBottom - margin.top)}
                        fill="transparent"
                        style={{ touchAction: 'pan-y' }}
                        onPointerDown={handlePointerMove}
                        onPointerMove={handlePointerMove}
                        onPointerLeave={() => onHoverIndex(null)}
                    />
                )}
            </svg>
            {showTooltip && hover !== null && hoverX !== null && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
                    style={hoverX > width / 2 ? { right: width - hoverX + 10 } : { left: hoverX + 10 }}
                >
                    <div className="mb-1 text-muted-foreground">{hoverLabel}</div>
                    <div className="mb-1 flex items-center justify-between gap-3 font-semibold">
                        <span>{t('median')}</span>
                        <span>{formatNumber(stats.median[hover], info.decimals)}</span>
                    </div>
                    {tooltipRows.map((r) => (
                        <div key={r.modelId} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <svg width="12" height="4" aria-hidden="true">
                                    <line
                                        x1="0"
                                        x2="12"
                                        y1="2"
                                        y2="2"
                                        stroke={MODEL_BY_ID[r.modelId].color}
                                        strokeWidth={2}
                                        strokeDasharray={MODEL_BY_ID[r.modelId].dash}
                                    />
                                </svg>
                                {MODEL_BY_ID[r.modelId].name}
                            </span>
                            <span className="font-medium">{formatNumber(r.value, info.decimals)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
