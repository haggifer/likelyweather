'use client'

import DayGrid from '@/charts/DayGrid'
import { getYDomain, getYTicks } from '@/charts/scales'
import {
    buildSpaghettiGeometry,
    getNearestIndex,
    getSpanIndex,
    getSumBarCenter,
    getSumSpan,
    Margin,
} from '@/charts/spaghettiGeometry'
import useAnimatedDomain from '@/charts/useAnimatedDomain'
import useChartTheme from '@/charts/useChartTheme'
import useElementWidth from '@/charts/useElementWidth'
import WindArrows from '@/charts/WindArrows'
import useNow from '@/hooks/useNow'
import { formatNumber, formatPeriodLabel, formatStepLabel } from '@/lib/format'
import { Series } from '@/shared/api'
import { HOUR_MS } from '@/shared/constants'
import { EnsembleStats } from '@/shared/ensemble'
import { MODEL_BY_ID, ModelId } from '@/shared/models'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { useTranslations } from 'next-intl'
import { KeyboardEvent, PointerEvent, useMemo } from 'react'

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
}

const ARROW_ROW = 26
const BAR_RATIO = 0.62
const MAX_TICK_WIDTH = 16
const HOVER_LABEL_HALF_WIDTH = 34
const PERIOD_LABEL_HALF_WIDTH = 50
const UNIT_LABEL_WIDTH = 28

const getMargin = (compact: boolean, hasArrows: boolean): Margin => ({
    top: compact ? 14 : 24,
    right: 12,
    bottom: (compact ? 22 : 30) + (hasArrows ? ARROW_ROW : 0),
    left: compact ? 34 : 44,
})

export default function SpaghettiChart({
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
    height = 340,
    compact = false,
    showTooltip = false,
    yDomain,
    now: nowProp,
}: IProps) {
    const t = useTranslations('chart')
    const theme = useChartTheme()
    const liveNow = useNow()
    const now = nowProp === undefined ? liveNow : nowProp
    const { ref, width } = useElementWidth<HTMLDivElement>()
    const info = VARIABLE_BY_ID[variable]
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getMargin(compact, hasArrows), [compact, hasArrows])
    const target = useMemo(
        () =>
            yDomain ??
            getYDomain(
                series.flatMap((s) => s.values),
                variable,
            ),
        [yDomain, series, variable],
    )
    const domain = useAnimatedDomain(target, variable)

    const geometry = useMemo(
        () => buildSpaghettiGeometry({ steps, series, stats, width, height, domain, margin }),
        [steps, series, stats, width, height, domain, margin],
    )
    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const nowX = now ? Math.max(margin.left, Math.min(width - margin.right, x(now))) : null
    const yTicks = getYTicks(domain, variable, compact ? 3 : 5)
    const isDimmed = (id: ModelId) => emphasized.length > 0 && !emphasized.includes(id)
    const isBars = variable === Variable.Precip
    const stepMs = times.length > 1 ? times[1].getTime() - times[0].getTime() : 3 * HOUR_MS
    const barWidth = Math.max(2, (x(new Date(times[0].getTime() + stepMs)) - x(times[0])) * BAR_RATIO)
    const tickWidth = Math.min(barWidth, MAX_TICK_WIDTH)
    const bars = isBars
        ? times
              .map((time, i) => ({ i, center: x(getSumBarCenter(time, stepMs)) }))
              .filter(
                  ({ center }) => center - barWidth / 2 >= margin.left && center + barWidth / 2 <= width - margin.right,
              )
        : []
    // Bars that would overflow the plot are not drawn, so hovering and stepping stay within the drawn ones.
    const minIndex = isBars && bars.length ? bars[0].i : 0
    const maxIndex = isBars && bars.length ? bars[bars.length - 1].i : times.length - 1

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        const box = e.currentTarget.getBoundingClientRect()
        const at = x.invert(e.clientX - box.left + margin.left)
        const index = isBars ? getSpanIndex(times, at, stepMs) : getNearestIndex(times, at)

        onHoverIndex?.(Math.max(minIndex, Math.min(maxIndex, index)))
    }

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

        e.preventDefault()
        const current = hoverIndex ?? getNearestIndex(times, now ?? times[0])
        onHoverIndex?.(Math.max(minIndex, Math.min(maxIndex, current + (e.key === 'ArrowRight' ? 1 : -1))))
    }

    const hover = hoverIndex !== null && times[hoverIndex] ? hoverIndex : null
    // A sum is hovered as the period it covers: shaded across, labelled with its start and end.
    const hoverSpan = hover !== null && isBars ? getSumSpan(times[hover], stepMs) : null
    const hoverTime = hover === null ? null : hoverSpan ? getSumBarCenter(times[hover], stepMs) : times[hover]
    const hoverX = hoverTime ? x(hoverTime) : null
    const hoverLabel =
        hover === null
            ? null
            : hoverSpan
              ? formatPeriodLabel(hoverSpan[0].toISOString(), hoverSpan[1].toISOString(), timeZone, locale)
              : formatStepLabel(steps[hover], timeZone, locale)
    const labelHalfWidth = hoverSpan ? PERIOD_LABEL_HALF_WIDTH : HOVER_LABEL_HALF_WIDTH
    const hoverLabelX =
        hoverX === null
            ? null
            : Math.max(
                  margin.left + UNIT_LABEL_WIDTH + labelHalfWidth,
                  Math.min(width - margin.right - labelHalfWidth, hoverX),
              )
    const spanLeft = hoverSpan ? Math.max(margin.left, x(hoverSpan[0])) : 0
    const spanRight = hoverSpan ? Math.min(width - margin.right, x(hoverSpan[1])) : 0
    const tooltipRows =
        hover !== null
            ? series
                  .map((s) => ({ modelId: s.modelId, value: s.values[hover] }))
                  .filter((r): r is { modelId: ModelId; value: number } => r.value !== null)
                  .sort((a, b) => b.value - a.value)
            : []

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
                        <line
                            x1={margin.left}
                            x2={width - margin.right}
                            y1={y(tick)}
                            y2={y(tick)}
                            stroke={theme.grid}
                        />
                        <text
                            x={margin.left - 6}
                            y={y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                            fontSize={compact ? 10 : 11}
                            fill={theme.muted}
                        >
                            {formatNumber(tick, info.decimals === 0 ? 0 : Number.isInteger(tick) ? 0 : 1)}
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
                    minLabelWidth={compact ? 44 : 64}
                    fontSize={compact ? 10 : 11}
                />
                {!compact && (
                    <text x={margin.left} y={margin.top - 8} fontSize={10} fill={theme.muted}>
                        {info.unit}
                    </text>
                )}
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
                            {median !== null && (
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
                                        strokeLinecap="round"
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
                            strokeLinecap="round"
                            opacity={isDimmed(modelId) ? 0.15 : 0.9}
                        />
                    ))}
                {!isBars && (
                    <path d={geometry.median} fill="none" stroke={theme.median} strokeWidth={3} strokeLinecap="round" />
                )}
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
                        {!isBars && stats.median[hover] !== null && (
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
