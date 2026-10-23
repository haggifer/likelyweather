'use client'

import { useChartScroll } from '@/hooks/useChartScroll'
import { useChartTheme } from '@/hooks/useChartTheme'
import { useDragScroll } from '@/hooks/useDragScroll'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useFocusVisible } from '@/hooks/useFocusVisible'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { useAnimatedDomain } from '@fa/chart-core/hooks/useAnimatedDomain'
import { CHART_FONT_SIZE, clamp, getBarWidth, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getScrollWidth, getVisibleRange, MIN_SLOT_WIDTH } from '@fa/chart-core/scroll-geometry'
import {
    BAR_OPACITY,
    buildSpaghettiGeometry,
    DEFAULT_SPAGHETTI_HEIGHT,
    getArrowRowY,
    getClipRect,
    getDrawnBars,
    getIndexAt,
    getIndexRange,
    getPickedIndex,
    getSeriesYDomain,
    getSpaghettiHeight,
    getSpaghettiMargin,
    getSpaghettiTicks,
    getStepMs,
    getTickWidth,
    SELECTED_BAR_OPACITY,
} from '@fa/chart-core/spaghetti-geometry'
import { getSpaghettiHover, getTooltipRows, UNIT_LABEL_WIDTH } from '@fa/chart-core/spaghetti-hover'
import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useTranslations } from 'next-intl'
import { KeyboardEvent, MouseEvent, PointerEvent, useCallback, useId, useMemo, useState } from 'react'
import { getArrowStep } from './arrow-keys'
import { DayGrid } from './DayGrid'
import { getPointerTime } from './pointer-time'
import { WindArrows } from './WindArrows'

const NO_MODELS: ModelId[] = []
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

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
    emphasized = NO_MODELS,
    directions,
    height: heightProp = DEFAULT_SPAGHETTI_HEIGHT,
    compact = false,
    showTooltip = false,
    now: nowProp,
    isMedianHidden = false,
}: IProps) {
    const t = useTranslations('chart')
    const theme = useChartTheme()
    const liveNow = useNow()
    const isReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
    const clipId = useId().replace(/[^\w-]/g, '')

    const { ref, width } = useElementWidth<HTMLDivElement>()
    const { isFocusVisible, onFocus, onBlur, onKeyDown: showFocus } = useFocusVisible()
    const [viewLeft, setViewLeft] = useState(0)

    const now = nowProp === undefined ? liveNow : nowProp
    const height = getSpaghettiHeight(width, heightProp)
    const info = VARIABLE_BY_ID[variable]
    const isBars = variable === Variable.Precip
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getSpaghettiMargin(compact, hasArrows), [compact, hasArrows])
    const contentWidth = getScrollWidth(width, steps.length - 1, MIN_SLOT_WIDTH, margin.left + margin.right)
    const target = useMemo(() => getSeriesYDomain(series, variable), [series, variable])
    const domain = useAnimatedDomain(target, variable, isReducedMotion)
    const geometry = useMemo(
        () => buildSpaghettiGeometry({ steps, series, stats, width: contentWidth, height, domain, margin }),
        [steps, series, stats, contentWidth, height, domain, margin],
    )

    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const plotRight = contentWidth - margin.right
    const nowX = getNowX(x, now, margin.left, plotRight)
    const yTicks = useMemo(
        () => getSpaghettiTicks(series, domain, variable, compact ? 3 : 5),
        [series, domain, variable, compact],
    )
    const stepMs = getStepMs(times)
    const barWidth = getBarWidth(x, times[0], stepMs)
    const tickWidth = getTickWidth(barWidth)
    const bars = useMemo(
        () => (isBars ? getDrawnBars(times, x, stepMs, barWidth, [margin.left, plotRight]) : []),
        [isBars, times, x, stepMs, barWidth, margin.left, plotRight],
    )
    const indexRange = getIndexRange(bars, isBars, times.length)
    const visibleRange = getVisibleRange(viewLeft, width, [margin.left, margin.right])
    const hover = getSpaghettiHover({
        hoverIndex,
        steps,
        times,
        x,
        isBars,
        stepMs,
        bars,
        visibleRange,
        margin,
        plotRight,
        timeZone,
        locale,
    })
    const hoverBar = hover?.bar
    const hoverMedian = hover ? stats.median[hover.index] : null
    const tooltipRows = hover && showTooltip ? getTooltipRows(series, hover.index) : []
    const clip = getClipRect(margin, plotRight, plotBottom)
    const isDimmed = useCallback((id: ModelId) => emphasized.length > 0 && !emphasized.includes(id), [emphasized])
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth: x(times[1] ?? times[0]) - x(times[0]),
        insetLeft: margin.left,
        contentWidth,
        viewportWidth: width,
    })

    // The key is the chart's start, not the variable, so switching variables keeps the reader's place.
    const { ref: scrollRef, reveal } = useChartScroll(`${steps[0]}|${contentWidth}`, initialScrollLeft, [
        margin.left,
        margin.right,
    ])
    const dragScroll = useDragScroll()

    // Everything that does not follow the pointer is built once per data, size or theme change, so a hover redraws
    // only the crosshair, the dots and the label.
    const staticLayer = useMemo(
        () => (
            <g>
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
                    <line key={tick} x1={margin.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={theme.grid} />
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
                    fontSize={CHART_FONT_SIZE}
                />
                <defs>
                    <clipPath id={clipId}>
                        <rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
                    </clipPath>
                </defs>
                {/* The bands and median span every model while the y-domain fits the visible ones, so a hidden
                    outlier's band is cut at the plot edge instead of covering the card header. */}
                <g clipPath={`url(#${clipId})`}>
                    {!isBars && <path d={geometry.rangeBand} fill={theme.band} opacity={theme.bandOpacity} />}
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
                                        opacity={BAR_OPACITY}
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
                        <text
                            x={nowX + 4}
                            y={margin.top + 10}
                            fontSize={CHART_FONT_SIZE}
                            fontWeight={600}
                            fill={theme.foreground}
                        >
                            {t('now')}
                        </text>
                    </g>
                )}
                {directions && (
                    <WindArrows
                        x={x}
                        times={times}
                        directions={directions}
                        y={getArrowRowY(height)}
                        color={theme.foreground}
                        mutedColor={theme.muted}
                        compassLabels={t('compass').split(',')}
                    />
                )}
            </g>
        ),
        [
            nowX,
            margin,
            plotBottom,
            plotRight,
            clip,
            theme,
            yTicks,
            x,
            y,
            times,
            timeZone,
            locale,
            compact,
            clipId,
            isBars,
            geometry,
            bars,
            stats,
            isMedianHidden,
            barWidth,
            tickWidth,
            series,
            emphasized,
            isDimmed,
            directions,
            height,
            t,
        ],
    )

    const selectAt = (e: MouseEvent<SVGRectElement>) => {
        onHoverIndex?.(getPickedIndex(times, getPointerTime(e, x, margin.left), stepMs, isBars, indexRange))
        // The hovered time's label clamps to the part of the plot on screen, read when a slot is picked.
        setViewLeft(scrollRef.current?.scrollLeft ?? 0)
    }
    // A finger's drag scrolls the chart, so touch selects on a tap (`click`) and keeps the selection after the finger
    // lifts, so its readout can be read; a tap outside the plot clears it, and so does a tap elsewhere, which blurs the
    // chart. A mouse follows the pointer and clears on leaving the plot.
    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        if (e.pointerType !== 'touch') selectAt(e)
    }
    const handlePlotPointerDown = (e: PointerEvent<SVGRectElement>) => {
        e.stopPropagation()
        handlePointerMove(e)
    }

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        const step = getArrowStep(e.key)

        if (!step) return

        const current = hoverIndex ?? getIndexAt(times, now ?? times[0], stepMs, isBars)
        const next = clamp(current + step, ...indexRange)

        e.preventDefault()
        showFocus()
        onHoverIndex?.(next)
        reveal(x(times[next]))
        setViewLeft(scrollRef.current?.scrollLeft ?? 0)
    }

    return (
        <div ref={ref} className={cn('relative w-full rounded-sm select-none', isFocusVisible && 'ring-2 ring-ring')}>
            {/* The scroller starts after the pinned axis, so its scrollbar runs under the plot only; the drawing moves back by
                as much, so every x and scroll position stays where it was. */}
            <div
                ref={scrollRef}
                {...dragScroll}
                className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] pointer-fine:cursor-grab pointer-fine:active:cursor-grabbing"
                style={{ marginLeft: margin.left }}
            >
                {/* Three stacked drawings: the hovered span's shade under everything, the static chart on its own
                    compositing layer, and the crosshair with the pointer area on top, so a hover repaints only the small
                    top and bottom drawings and not ten model lines across ten days. */}
                <div className="relative" style={{ width: contentWidth, marginLeft: -margin.left }}>
                    <svg
                        width={contentWidth}
                        height={height}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0"
                    >
                        {hover?.shade && (
                            <rect
                                x={hover.shade.left}
                                y={margin.top}
                                width={hover.shade.width}
                                height={plotBottom - margin.top}
                                fill={theme.grid}
                                opacity={0.8}
                            />
                        )}
                    </svg>
                    <svg
                        width={contentWidth}
                        height={height}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0 overflow-visible will-change-transform"
                    >
                        {staticLayer}
                    </svg>
                    <svg
                        width={contentWidth}
                        height={height}
                        role="img"
                        aria-label={ariaLabel}
                        tabIndex={onHoverIndex ? 0 : -1}
                        onKeyDown={handleKeyDown}
                        onFocus={onFocus}
                        onBlur={() => {
                            onBlur()
                            onHoverIndex?.(null)
                        }}
                        onPointerDown={() => onHoverIndex?.(null)}
                        className="relative block overflow-visible outline-none"
                    >
                        {hover && (
                            <g pointerEvents="none">
                                {hoverBar && !isMedianHidden && hoverMedian !== null && (
                                    <rect
                                        x={hoverBar.center - barWidth / 2}
                                        y={y(hoverMedian)}
                                        width={barWidth}
                                        height={Math.max(0, plotBottom - y(hoverMedian))}
                                        rx={2}
                                        fill={theme.band}
                                        opacity={SELECTED_BAR_OPACITY}
                                    />
                                )}
                                {hoverBar &&
                                    series.map((s) => {
                                        const v = s.values[hover.index]

                                        return v === null ? null : (
                                            <line
                                                key={s.modelId}
                                                x1={hoverBar.center - tickWidth / 2}
                                                x2={hoverBar.center + tickWidth / 2}
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
                                {!isBars && (
                                    <line
                                        x1={hover.x}
                                        x2={hover.x}
                                        y1={margin.top}
                                        y2={plotBottom}
                                        stroke={theme.muted}
                                    />
                                )}
                                {!compact && (
                                    <text
                                        x={hover.labelX}
                                        y={margin.top - 8}
                                        textAnchor="middle"
                                        fontSize={CHART_FONT_SIZE}
                                        fontWeight={600}
                                        fill={theme.foreground}
                                    >
                                        {hover.label}
                                    </text>
                                )}
                                {!isBars &&
                                    series.map((s) => {
                                        const v = s.values[hover.index]

                                        if (v === null || isDimmed(s.modelId)) return null

                                        return (
                                            <circle
                                                key={s.modelId}
                                                cx={hover.x}
                                                cy={y(v)}
                                                r={3.5}
                                                fill={MODEL_BY_ID[s.modelId].color}
                                                stroke={theme.card}
                                                strokeWidth={2}
                                            />
                                        )
                                    })}
                                {!isBars && !isMedianHidden && hoverMedian !== null && (
                                    <circle
                                        cx={hover.x}
                                        cy={y(hoverMedian)}
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
                                width={Math.max(0, contentWidth - margin.left - margin.right)}
                                height={Math.max(0, plotBottom - margin.top)}
                                fill="transparent"
                                style={{ touchAction: 'pan-x pan-y' }}
                                onPointerDown={handlePlotPointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerLeave={(e) => e.pointerType !== 'touch' && onHoverIndex(null)}
                                onClick={selectAt}
                            />
                        )}
                    </svg>
                    {showTooltip && hover && (
                        <div
                            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
                            style={
                                hover.x > contentWidth / 2
                                    ? { right: contentWidth - hover.x + 10 }
                                    : { left: hover.x + 10 }
                            }
                        >
                            <div className="mb-1 text-muted-foreground">{hover.label}</div>
                            <div className="mb-1 flex items-center justify-between gap-3 font-semibold">
                                <span>{t('median')}</span>
                                <span>{formatNumber(hoverMedian, info.decimals)}</span>
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
            </div>
            {/* The axis stays while the plot scrolls under it, on a card-coloured column that starts a pixel early, so a
                fractional zoom leaves no seam where the plot would show through. */}
            <svg
                width={margin.left}
                height={height}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 overflow-visible"
            >
                <rect x={-1} width={margin.left + 1} height={height} fill={theme.card} />
                {yTicks.map((tick) => (
                    <text
                        key={tick}
                        x={margin.left - 6}
                        y={y(tick)}
                        dy="0.32em"
                        textAnchor="end"
                        fontSize={CHART_FONT_SIZE}
                        fill={theme.muted}
                    >
                        {formatYTick(tick, info.decimals === 0)}
                    </text>
                ))}
            </svg>
            {!compact && (
                <svg
                    width={UNIT_LABEL_WIDTH}
                    height={margin.top}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0"
                    style={{ left: margin.left }}
                >
                    <rect width={UNIT_LABEL_WIDTH} height={margin.top - 2} fill={theme.card} />
                    <text y={margin.top - 8} fontSize={CHART_FONT_SIZE} fill={theme.muted}>
                        {info.unit}
                    </text>
                </svg>
            )}
        </div>
    )
}
