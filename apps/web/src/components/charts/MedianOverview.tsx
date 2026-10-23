'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useChartScroll } from '@/hooks/useChartScroll'
import { useChartTheme } from '@/hooks/useChartTheme'
import { useDragScroll } from '@/hooks/useDragScroll'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useFocusVisible } from '@/hooks/useFocusVisible'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useOverviewPanels } from '@/hooks/useOverviewPanels'
import { cn } from '@/lib/cn'
import {
    AXIS_HEIGHT,
    getArrowY,
    getChanceLabels,
    getChanceY,
    getHoverDots,
    getOverviewContentWidth,
    getOverviewFrame,
    getOverviewLayout,
    getPanelBars,
    getPanelHeight,
    getPanelPaths,
    getPanelScale,
    HOVER_STRIP,
    OVERVIEW_MARGIN_RIGHT,
    OVERVIEW_PHONE_SIZE,
    OVERVIEW_SIZE,
    OverviewSize,
    PANEL_RADIUS,
    ROW_GAP,
    SECONDARY_DASH,
} from '@fa/chart-core/overview-geometry'
import {
    getExtraReadout,
    getOverviewReadoutIndex,
    getPanelReadoutIndex,
    getPanelSeries,
    getPrecipUnitKey,
    getValueAt,
} from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { CHART_FONT_SIZE, clamp, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getLabelX, getVisibleRange } from '@fa/chart-core/scroll-geometry'
import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { getVisiblePanels, PanelVariable } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useTranslations } from 'next-intl'
import { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, useId, useMemo, useState } from 'react'
import { getArrowStep } from './arrow-keys'
import { DayGrid } from './DayGrid'
import { getPointerTime } from './pointer-time'
import { WindArrows } from './WindArrows'

interface ChartSize extends OverviewSize {
    isNowLabelAbove: boolean
}

interface SkeletonProps {
    panels?: PanelVariable[]
    // The archive's precipitation panel has no chance-of-rain strip.
    isArchive?: boolean
}

const DESKTOP_SIZE: ChartSize = { ...OVERVIEW_SIZE, isNowLabelAbove: false }
const PHONE_SIZE: ChartSize = {
    ...OVERVIEW_PHONE_SIZE,
    // The panel names sit in the panels' top-left corner, where the "now" line always is right after a fetch; above
    // the panels the label centres on its line like the hovered time (author, 2026-10-13).
    isNowLabelAbove: true,
}
// Phones stack the readouts in a two-column grid above a full-width chart (equal columns whose rows line up); from
// `sm` they form a 12rem column beside it, one per panel. The column's gap and padding match ROW_GAP, HOVER_STRIP and AXIS_HEIGHT.
const GRID = 'flex flex-col gap-y-3 sm:flex-row sm:gap-x-4 sm:*:last:min-w-0 sm:*:last:flex-1'
const READOUTS = 'grid grid-cols-2 gap-2 sm:flex sm:w-48 sm:shrink-0 sm:flex-col sm:gap-3.5 sm:pt-5 sm:pb-5.5'
const STACKED_QUERY = '(width < 62rem)'
const COLUMN_GAP = 16
const SKELETON_GAP = 24
const SKELETON_READOUT_REACH = SKELETON_GAP - COLUMN_GAP - DESKTOP_SIZE.marginLeft

const getGeometry = (size: ChartSize, panels: PanelVariable[], hasChance: boolean) => ({
    ...size,
    ...getOverviewLayout(size.heights, panels, hasChance),
})

// The chart column's blocks are inset by the tick-label margin, so they cover exactly the panel backgrounds; the
// readout blocks reach across the tick labels to leave a SKELETON_GAP between the two columns. It renders before the
// media query is known, so CSS picks the phone or desktop geometry, and with the reader's panels.
export function MedianOverviewSkeleton({ panels, isArchive = false }: SkeletonProps) {
    const { panels: stored } = useOverviewPanels()

    // The overview's own choice unless a page with its own panels (the archive) passes them.
    const visible = panels ?? getVisiblePanels(stored)

    return (
        <div className={GRID} role="presentation">
            <div className={READOUTS}>
                {visible.map((variable) => (
                    <Skeleton
                        key={variable}
                        className="h-[3.5625rem] sm:mr-(--reach) sm:h-(--row-h)"
                        style={
                            {
                                '--row-h': `${getPanelHeight(DESKTOP_SIZE.heights, variable, !isArchive)}px`,
                                '--reach': `${SKELETON_READOUT_REACH}px`,
                            } as CSSProperties
                        }
                    />
                ))}
            </div>
            <div
                className="flex flex-col"
                style={{ gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }}
            >
                {visible.map((variable) => (
                    <Skeleton
                        key={variable}
                        className="ml-(--phone-left) h-(--phone-h) sm:ml-(--left) sm:h-(--row-h)"
                        style={
                            {
                                '--row-h': `${getPanelHeight(DESKTOP_SIZE.heights, variable, !isArchive)}px`,
                                '--phone-h': `${getPanelHeight(PHONE_SIZE.heights, variable, !isArchive)}px`,
                                '--left': `${DESKTOP_SIZE.marginLeft}px`,
                                '--phone-left': `${PHONE_SIZE.marginLeft}px`,
                                marginRight: OVERVIEW_MARGIN_RIGHT,
                            } as CSSProperties
                        }
                    />
                ))}
            </div>
        </div>
    )
}

interface IProps {
    panels: PanelVariable[]
    series: OverviewMedians
    directions: (number | null)[] | null
    // The share of models above 0.2 mm per slot; the archive has one series and passes none.
    chance: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date | null
    ariaLabel: string
    // Past weather, hour by hour: precipitation reads as the hour from the step.
    isArchive?: boolean
}

// Median of all models for each of the reader's panels on one time axis of 3-hour slots; a precipitation bar is the
// amount of the 3 hours after its slot, and the strip under the bars the share of models above 0.2 mm in it. Readouts
// follow the crosshair, or the slot nearest to `now`; the hovered slot's time sits above the panels. `now` draws the
// "now" line at the exact current time, which is inside the first slot right after a refresh, and shades the past.
// The archive draws a city's past weather the same way, every hour and narrower, without a now line or a chance of
// rain.
export function MedianOverview({
    panels,
    series,
    directions,
    chance,
    timeZone,
    locale,
    now,
    ariaLabel,
    isArchive = false,
}: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const tcity = useTranslations('city')
    const theme = useChartTheme()
    const isStacked = useMediaQuery(STACKED_QUERY)
    const clipId = useId().replace(/[^\w-]/g, '')

    const { ref, width } = useElementWidth<HTMLDivElement>()
    const { isFocusVisible, onFocus, onBlur, onKeyDown: showFocus } = useFocusVisible()
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const [viewLeft, setViewLeft] = useState(0)

    const hasChance = chance !== null
    const geometry = useMemo(
        () => getGeometry(isStacked ? PHONE_SIZE : DESKTOP_SIZE, panels, hasChance),
        [isStacked, panels, hasChance],
    )
    const axisSteps = getPanelSeries(series, panels[0]).steps
    const times = useMemo(() => axisSteps.map((s) => new Date(s)), [axisSteps])
    const contentWidth = getOverviewContentWidth(width, times.length, geometry.marginLeft, isArchive)
    const frame = useMemo(
        () => getOverviewFrame(times, geometry.marginLeft, contentWidth, isArchive),
        [times, geometry.marginLeft, contentWidth, isArchive],
    )
    const { x, plotRight, plotWidth, slotWidth } = frame
    const readoutIndex = getOverviewReadoutIndex(times, hoverIndex, now)
    const nowX = getNowX(x, now, geometry.marginLeft, plotRight)
    const nowLabelY = geometry.isNowLabelAbove ? geometry.plotTop - 7 : geometry.plotTop + CHART_FONT_SIZE
    const isNowLabelShown = !geometry.isNowLabelAbove || hoverIndex === null
    const scales = useMemo(() => geometry.rows.map((row) => getPanelScale(row, series)), [geometry, series])
    const hoverDots = hoverIndex === null ? [] : getHoverDots(geometry.rows, scales, series, axisSteps[hoverIndex])
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth,
        insetLeft: geometry.marginLeft,
        contentWidth,
        viewportWidth: width,
    })
    const visibleRange = getVisibleRange(viewLeft, width, [geometry.marginLeft, OVERVIEW_MARGIN_RIGHT])
    const crosshairX = hoverIndex === null ? null : x(times[hoverIndex])
    const hoverX = crosshairX === null ? null : getLabelX(crosshairX, visibleRange, geometry.hoverLabelHalfWidth)

    const { ref: scrollRef, reveal } = useChartScroll(`${axisSteps[0]}|${contentWidth}`, initialScrollLeft, [
        geometry.marginLeft,
        OVERVIEW_MARGIN_RIGHT,
    ])
    const dragScroll = useDragScroll()

    // Everything that does not follow the pointer is built once per data, size or theme change; a hover redraws only
    // the crosshair, the dots and the labels.
    const staticLayer = useMemo(
        () => (
            <g>
                <defs>
                    {geometry.spans.map(({ top, bottom }, i) => (
                        <clipPath key={top} id={`${clipId}-${i}`}>
                            <rect
                                x={geometry.marginLeft}
                                y={top}
                                width={plotWidth}
                                height={bottom - top}
                                rx={PANEL_RADIUS}
                            />
                        </clipPath>
                    ))}
                </defs>
                {geometry.spans.map(({ top, bottom }) => (
                    <rect
                        key={top}
                        x={geometry.marginLeft}
                        y={top}
                        width={plotWidth}
                        height={bottom - top}
                        rx={PANEL_RADIUS}
                        fill={theme.grid}
                        opacity={0.4}
                    />
                ))}
                {nowX !== null &&
                    geometry.spans.map(({ top, bottom }, i) => (
                        <rect
                            key={top}
                            x={geometry.marginLeft}
                            y={top}
                            width={Math.max(0, nowX - geometry.marginLeft)}
                            height={bottom - top}
                            fill={theme.grid}
                            opacity={0.6}
                            clipPath={`url(#${clipId}-${i})`}
                        />
                    ))}
                {geometry.rows.map((row, rowIndex) => {
                    const { variable, bottom } = row
                    const { y, ticks } = scales[rowIndex]
                    const paths = variable === Variable.Precip ? null : getPanelPaths(row, series, x, y)

                    return (
                        <g key={variable}>
                            {ticks.map((tick) => (
                                <line
                                    key={tick}
                                    x1={geometry.marginLeft}
                                    x2={plotRight}
                                    y1={y(tick)}
                                    y2={y(tick)}
                                    stroke={theme.grid}
                                />
                            ))}
                            {paths ? (
                                <>
                                    <path d={paths.area} fill={theme.band} opacity={theme.bandOpacity} />
                                    <path
                                        d={paths.line}
                                        fill="none"
                                        stroke={theme.median}
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                    />
                                    {paths.secondary !== null && (
                                        <path
                                            d={paths.secondary}
                                            fill="none"
                                            stroke={theme.median}
                                            strokeWidth={1.5}
                                            strokeDasharray={SECONDARY_DASH}
                                            opacity={0.7}
                                        />
                                    )}
                                </>
                            ) : (
                                getPanelBars(row, series, x, y, frame).map((bar) => (
                                    <rect
                                        key={bar.key}
                                        x={bar.x}
                                        y={bar.y}
                                        width={bar.width}
                                        height={bar.height}
                                        rx={2}
                                        fill={theme.band}
                                        opacity={0.75}
                                    />
                                ))
                            )}
                            {variable === Variable.Precip && chance && (
                                <g aria-hidden="true">
                                    {getChanceLabels(chance, times, x, frame).map((label) => (
                                        <text
                                            key={label.key}
                                            x={label.x}
                                            y={getChanceY(bottom)}
                                            dy="0.32em"
                                            textAnchor="middle"
                                            fontSize={CHART_FONT_SIZE}
                                            fontWeight={label.isLikely ? 600 : 400}
                                            fill={label.isLikely ? theme.foreground : theme.muted}
                                        >
                                            {label.text}
                                        </text>
                                    ))}
                                </g>
                            )}
                            {variable === Variable.Wind && directions && (
                                <WindArrows
                                    x={x}
                                    times={times}
                                    directions={directions}
                                    y={getArrowY(bottom)}
                                    color={theme.foreground}
                                    mutedColor={theme.muted}
                                    compassLabels={tc('compass').split(',')}
                                />
                            )}
                        </g>
                    )
                })}
                <DayGrid
                    x={x}
                    start={times[0]}
                    end={times[times.length - 1]}
                    timeZone={timeZone}
                    locale={locale}
                    spans={geometry.spans}
                    labelYs={[geometry.plotBottom + 5 + CHART_FONT_SIZE]}
                    lineColor={theme.border}
                    labelColor={theme.muted}
                />
                {nowX !== null && (
                    <g pointerEvents="none">
                        {geometry.spans.map(({ top, bottom }) => (
                            <line
                                key={top}
                                x1={nowX}
                                x2={nowX}
                                y1={top}
                                y2={bottom}
                                stroke={theme.foreground}
                                strokeDasharray="4 3"
                            />
                        ))}
                    </g>
                )}
            </g>
        ),
        [
            geometry,
            clipId,
            plotWidth,
            plotRight,
            theme,
            nowX,
            series,
            scales,
            x,
            frame,
            chance,
            times,
            directions,
            tc,
            timeZone,
            locale,
        ],
    )

    // The hovered time's label clamps to the part of the plot on screen, read when a slot is picked.
    const selectAt = (e: MouseEvent<SVGRectElement>) => {
        setHoverIndex(getNearestIndex(times, getPointerTime(e, x, geometry.marginLeft)))
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

        const next = clamp(readoutIndex + step, 0, times.length - 1)

        e.preventDefault()
        showFocus()
        setHoverIndex(next)
        reveal(x(times[next]))
        setViewLeft(scrollRef.current?.scrollLeft ?? 0)
    }

    return (
        <div className={GRID}>
            <div className={READOUTS}>
                {geometry.rows.map(({ variable, height }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const index = getPanelReadoutIndex(variable, times, hoverIndex, now)
                    const value = getValueAt(getPanelSeries(series, variable), axisSteps[index])
                    const extra = getExtraReadout(variable, series, chance, axisSteps[index], index)

                    return (
                        <div
                            key={variable}
                            className="flex flex-col justify-center border-l-2 pl-3 sm:h-(--row-h)"
                            style={{ '--row-h': `${height}px` } as CSSProperties}
                        >
                            <span className="text-xs font-medium text-muted-foreground max-sm:text-sm">
                                {tv(variable)}
                            </span>
                            <span className="text-xl leading-tight font-semibold sm:text-2xl">
                                {formatNumber(value, info.decimals)}
                                <span className="ml-1 text-sm font-normal whitespace-nowrap text-muted-foreground">
                                    {variable === Variable.Precip
                                        ? t(getPrecipUnitKey(isArchive, hoverIndex === null), {
                                              unit: info.unit,
                                              hours: SLOT_HOURS,
                                          })
                                        : info.unit}
                                </span>
                            </span>
                            {extra && (
                                <span className="text-xs text-muted-foreground">
                                    {t('secondary', {
                                        name: extra.variable ? tv(extra.variable) : tcity('chanceOfRain'),
                                        value: extra.value,
                                        unit: extra.unit,
                                    })}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
            <div
                ref={ref}
                className={cn('relative min-w-0 rounded-sm select-none', isFocusVisible && 'ring-2 ring-ring')}
            >
                {/* The scroller starts after the pinned axis, so its scrollbar runs under the plot only; the drawing moves back
                    by as much, so every x and scroll position stays where it was. */}
                <div
                    ref={scrollRef}
                    {...dragScroll}
                    className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] pointer-fine:cursor-grab pointer-fine:active:cursor-grabbing"
                    style={{ marginLeft: geometry.marginLeft }}
                >
                    {/* The static drawing sits on its own compositing layer under the interactive one, so a hover
                        repaints only the crosshair, the dots and the label. */}
                    <div className="relative" style={{ width: contentWidth, marginLeft: -geometry.marginLeft }}>
                        <svg
                            width={contentWidth}
                            height={geometry.totalHeight}
                            aria-hidden="true"
                            className="pointer-events-none absolute top-0 left-0 overflow-visible will-change-transform"
                        >
                            {staticLayer}
                        </svg>
                        <svg
                            width={contentWidth}
                            height={geometry.totalHeight}
                            role="img"
                            aria-label={ariaLabel}
                            tabIndex={0}
                            onKeyDown={handleKeyDown}
                            onFocus={onFocus}
                            onBlur={() => {
                                onBlur()
                                setHoverIndex(null)
                            }}
                            onPointerDown={() => setHoverIndex(null)}
                            className="relative block overflow-visible outline-none"
                        >
                            {nowX !== null && isNowLabelShown && (
                                <text
                                    x={geometry.isNowLabelAbove ? nowX : nowX + 4}
                                    y={nowLabelY}
                                    textAnchor={geometry.isNowLabelAbove ? 'middle' : 'start'}
                                    fontSize={CHART_FONT_SIZE}
                                    fontWeight={600}
                                    fill={theme.foreground}
                                    pointerEvents="none"
                                >
                                    {tc('now')}
                                </text>
                            )}
                            {crosshairX !== null &&
                                hoverDots.map(({ key, cy, isSecondary }) => (
                                    <circle
                                        key={key}
                                        cx={crosshairX}
                                        cy={cy}
                                        r={isSecondary ? 3 : 4}
                                        fill={isSecondary ? theme.card : theme.median}
                                        stroke={isSecondary ? theme.median : theme.card}
                                        strokeWidth={isSecondary ? 1.5 : 2}
                                        pointerEvents="none"
                                    />
                                ))}
                            {hoverIndex !== null && hoverX !== null && (
                                <text
                                    x={hoverX}
                                    y={geometry.plotTop - 7}
                                    textAnchor="middle"
                                    fontSize={CHART_FONT_SIZE}
                                    fontWeight={600}
                                    fill={theme.foreground}
                                    pointerEvents="none"
                                >
                                    {formatStepLabel(axisSteps[hoverIndex], timeZone, locale)}
                                </text>
                            )}
                            {crosshairX !== null &&
                                geometry.spans.map(({ top, bottom }) => (
                                    <line
                                        key={top}
                                        x1={crosshairX}
                                        x2={crosshairX}
                                        y1={top}
                                        y2={bottom}
                                        stroke={theme.muted}
                                        pointerEvents="none"
                                    />
                                ))}
                            <rect
                                x={geometry.marginLeft}
                                y={geometry.plotTop}
                                width={plotWidth}
                                height={geometry.plotBottom - geometry.plotTop}
                                fill="transparent"
                                style={{ touchAction: 'pan-x pan-y' }}
                                onPointerDown={handlePlotPointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerLeave={(e) => e.pointerType !== 'touch' && setHoverIndex(null)}
                                onClick={selectAt}
                            />
                        </svg>
                    </div>
                </div>
                {/* The axis stays while the plot scrolls under it: the tick labels on a card-coloured column, and on
                    phones the panel names in the panels' corners. The column starts a pixel early, so a fractional zoom leaves no
                    seam where the plot would show through. */}
                <svg
                    width={width}
                    height={geometry.totalHeight}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0 overflow-visible"
                >
                    <rect x={-1} width={geometry.marginLeft + 1} height={geometry.totalHeight} fill={theme.card} />
                    {geometry.rows.map(({ variable, bottom }, rowIndex) => (
                        <g key={variable}>
                            {scales[rowIndex].ticks.map((tick) => (
                                <text
                                    key={tick}
                                    x={geometry.marginLeft - 6}
                                    y={scales[rowIndex].y(tick)}
                                    dy="0.32em"
                                    textAnchor="end"
                                    fontSize={CHART_FONT_SIZE}
                                    fill={theme.muted}
                                >
                                    {formatYTick(tick)}
                                </text>
                            ))}
                            {variable === Variable.Precip && chance && (
                                <text
                                    x={geometry.marginLeft - 6}
                                    y={getChanceY(bottom)}
                                    dy="0.32em"
                                    textAnchor="end"
                                    fontSize={CHART_FONT_SIZE}
                                    fill={theme.muted}
                                >
                                    %
                                </text>
                            )}
                        </g>
                    ))}
                    {isStacked &&
                        geometry.rows.map(({ variable, top }) => (
                            <text
                                key={variable}
                                x={geometry.marginLeft + 6}
                                y={top + CHART_FONT_SIZE + 2}
                                fontSize={CHART_FONT_SIZE}
                                fontWeight={600}
                                fill={theme.muted}
                                stroke={theme.card}
                                strokeWidth={3}
                                paintOrder="stroke"
                            >
                                {tv(variable)}, {VARIABLE_BY_ID[variable].unit}
                            </text>
                        ))}
                </svg>
            </div>
        </div>
    )
}
