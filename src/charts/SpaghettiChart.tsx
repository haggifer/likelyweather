'use client'

import DayGrid from '@/charts/DayGrid'
import { getYDomain, getYTicks } from '@/charts/scales'
import { buildSpaghettiGeometry, getNearestIndex, Margin } from '@/charts/spaghettiGeometry'
import useAnimatedDomain from '@/charts/useAnimatedDomain'
import useChartTheme from '@/charts/useChartTheme'
import useElementWidth from '@/charts/useElementWidth'
import WindArrows from '@/charts/WindArrows'
import useNow from '@/hooks/useNow'
import { formatNumber, formatStepLabel } from '@/lib/format'
import { Series } from '@/shared/api'
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
    now?: Date
}

const ARROW_ROW = 26

const getMargin = (compact: boolean, hasArrows: boolean): Margin => ({
    top: 14,
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
    const now = nowProp ?? liveNow
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
    const domain = useAnimatedDomain(target)

    const geometry = useMemo(
        () => buildSpaghettiGeometry({ steps, series, stats, width, height, domain, margin }),
        [steps, series, stats, width, height, domain, margin],
    )
    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const nowX = now ? Math.max(margin.left, Math.min(width - margin.right, x(now))) : null
    const yTicks = getYTicks(domain, variable, compact ? 3 : 5)
    const isDimmed = (id: ModelId) => emphasized.length > 0 && !emphasized.includes(id)
    const showOuter = theme.bands === 'minmax-iqr'
    const showInner = theme.bands !== 'none'

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        const box = e.currentTarget.getBoundingClientRect()
        onHoverIndex?.(getNearestIndex(times, x.invert(e.clientX - box.left + margin.left)))
    }

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

        e.preventDefault()
        const current = hoverIndex ?? getNearestIndex(times, now ?? times[0])
        onHoverIndex?.(Math.max(0, Math.min(times.length - 1, current + (e.key === 'ArrowRight' ? 1 : -1))))
    }

    const hover = hoverIndex !== null && times[hoverIndex] ? hoverIndex : null
    const hoverX = hover !== null ? x(times[hover]) : null
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
                    <text x={margin.left} y={margin.top - 4} fontSize={10} fill={theme.muted}>
                        {info.unit}
                    </text>
                )}
                {showOuter && <path d={geometry.outerBand} fill={theme.band} opacity={theme.bandOuterOpacity} />}
                {showInner && <path d={geometry.innerBand} fill={theme.band} opacity={theme.bandInnerOpacity} />}
                {geometry.lines.map(({ modelId, d }) => (
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
                <path d={geometry.median} fill="none" stroke={theme.median} strokeWidth={3} strokeLinecap="round" />
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
                        <line x1={hoverX} x2={hoverX} y1={margin.top} y2={plotBottom} stroke={theme.muted} />
                        {series.map((s) => {
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
                        {stats.median[hover] !== null && (
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
                    <div className="mb-1 text-muted-foreground">{formatStepLabel(steps[hover], timeZone, locale)}</div>
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
