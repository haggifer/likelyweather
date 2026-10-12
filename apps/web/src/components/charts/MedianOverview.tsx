'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useChartScroll } from '@/hooks/useChartScroll'
import { useChartTheme } from '@/hooks/useChartTheme'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MedianSeries } from '@fa/chart-core/overview-stats'
import { clamp, getBarWidth, getNowX, getTimeScale, getValueScale } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getMinSlotWidth, getScrollWidth } from '@fa/chart-core/scroll-geometry'
import { getNearestIndex, getSumBarCenter } from '@fa/chart-core/spaghetti-geometry'
import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { SLOT_HOURS } from '@fa/shared/slots'
import { OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { useTranslations } from 'next-intl'
import { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, useId, useState } from 'react'
import { getArrowStep } from './arrow-keys'
import { DayGrid } from './DayGrid'
import { getPointerTime } from './pointer-time'
import { WindArrows } from './WindArrows'

type PanelVariable = Variable.Temp | Variable.Wind | Variable.Pressure | Variable.Precip

interface RowLayout {
    variable: PanelVariable
    top: number
    bottom: number
    height: number
}

interface ChartSize {
    rows: { variable: PanelVariable; height: number }[]
    marginLeft: number
    tickFontSize: number
    labelFontSize: number
    hoverLabelHalfWidth: number
    isNowLabelAbove: boolean
}

interface ChartGeometry extends ChartSize {
    layout: RowLayout[]
    spans: { top: number; bottom: number }[]
    plotTop: number
    plotBottom: number
    totalHeight: number
}

type Point = [Date, number | null]

// On a phone the overview is the landing page's main content, so its panels are taller and its text larger than in
// the desktop column (author, 2026-10-09); the readouts above the chart leave it the full width.
const DESKTOP_SIZE: ChartSize = {
    rows: [
        { variable: Variable.Temp, height: 104 },
        { variable: Variable.Wind, height: 100 },
        { variable: Variable.Pressure, height: 80 },
        { variable: Variable.Precip, height: 80 + 18 },
    ],
    marginLeft: 36,
    tickFontSize: 10,
    labelFontSize: 11,
    hoverLabelHalfWidth: 34,
    isNowLabelAbove: false,
}
const PHONE_SIZE: ChartSize = {
    rows: [
        { variable: Variable.Temp, height: 120 },
        { variable: Variable.Wind, height: 115 },
        { variable: Variable.Pressure, height: 92 },
        { variable: Variable.Precip, height: 92 + 18 },
    ],
    marginLeft: 44,
    tickFontSize: 13,
    labelFontSize: 13,
    hoverLabelHalfWidth: 42,
    // The panel names sit in the panels' top-left corner, where the "now" line always is right after a fetch.
    isNowLabelAbove: true,
}
const ROW_GAP = 14
const ROW_PAD = 6
const ARROW_STRIP = 20
// The chance of rain sits under the precipitation bars like the direction arrows under the wind; the panel's height
// above includes it, so the bars keep their room.
const CHANCE_STRIP = 18
// Feels-like and gusts are drawn as a second, dashed line in the panel of the variable they belong to.
const SECONDARY: Partial<Record<PanelVariable, OverviewVariable>> = {
    [Variable.Temp]: Variable.Feels,
    [Variable.Wind]: Variable.Gusts,
}
const SECONDARY_DASH = '5 3'
const HOVER_STRIP = 20
const AXIS_HEIGHT = 22
const MARGIN_RIGHT = 8
const PANEL_RADIUS = 4
const SLOT_MS = SLOT_HOURS * HOUR_MS
// Phones stack the readouts in a 2 × 2 grid above a full-width chart; from `sm` they form a column beside it, one
// per panel. The column's gap and padding match ROW_GAP, HOVER_STRIP and AXIS_HEIGHT.
const GRID = 'grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:gap-x-4'
const READOUTS = 'grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3.5 sm:pt-5 sm:pb-5.5'
const STACKED_QUERY = '(width < 40rem)'
const COLUMN_GAP = 16
const SKELETON_GAP = 24
const SKELETON_READOUT_REACH = SKELETON_GAP - COLUMN_GAP - DESKTOP_SIZE.marginLeft

const getLayout = (rows: ChartSize['rows']) =>
    rows.reduce<RowLayout[]>((layout, row) => {
        const previous = layout[layout.length - 1]
        const top = previous ? previous.top + previous.height + ROW_GAP : HOVER_STRIP
        const strip = row.variable === Variable.Wind ? ARROW_STRIP : row.variable === Variable.Precip ? CHANCE_STRIP : 0

        return [
            ...layout,
            { variable: row.variable, top, height: row.height, bottom: top + row.height - ROW_PAD - strip },
        ]
    }, [])

const getGeometry = (size: ChartSize): ChartGeometry => {
    const layout = getLayout(size.rows)
    const last = layout[layout.length - 1]
    const plotBottom = last.top + last.height

    return {
        ...size,
        layout,
        spans: layout.map(({ top, height }) => ({ top, bottom: top + height })),
        plotTop: layout[0].top,
        plotBottom,
        totalHeight: plotBottom + AXIS_HEIGHT,
    }
}

const DESKTOP = getGeometry(DESKTOP_SIZE)
const PHONE = getGeometry(PHONE_SIZE)

const isDefined = (p: Point) => p[1] !== null

const getValueAt = (s: MedianSeries, step: string) => {
    const index = s.steps.indexOf(step)

    return index >= 0 ? s.values[index] : null
}

// Gusts outrun the mean wind, so a wind panel showing them takes the gusts' axis steps.
const getPanelDomain = (variable: PanelVariable, s: MedianSeries, secondary: MedianSeries | null) => {
    const hasSecondary = Boolean(secondary?.values.some((v) => v !== null))
    const scaleVariable = hasSecondary && variable === Variable.Wind ? Variable.Gusts : variable
    const values = hasSecondary ? [...s.values, ...secondary!.values] : s.values

    return { domain: getYDomain(values, scaleVariable), scaleVariable }
}

// A panel's value axis: the scale and the ticks its gridlines and its pinned labels share.
const getPanelScale = (row: RowLayout, series: Record<OverviewVariable, MedianSeries>) => {
    const secondaryVariable = SECONDARY[row.variable]
    const secondary = secondaryVariable ? series[secondaryVariable] : null
    const { domain, scaleVariable } = getPanelDomain(row.variable, series[row.variable], secondary)

    return { y: getValueScale(domain, [row.bottom, row.top + ROW_PAD]), ticks: getYTicks(domain, scaleVariable, 3) }
}

const toPoints = (s: MedianSeries): Point[] => s.steps.map((step, i) => [new Date(step), s.values[i]])

const getAreaPath = (points: Point[], x: ScaleTime<number, number>, y: ScaleLinear<number, number>, bottom: number) =>
    area<Point>()
        .defined(isDefined)
        .x((p) => x(p[0]))
        .y0(bottom)
        .y1((p) => y(p[1] as number))
        .curve(curveMonotoneX)(points) ?? ''

const getLinePath = (points: Point[], x: ScaleTime<number, number>, y: ScaleLinear<number, number>) =>
    line<Point>()
        .defined(isDefined)
        .x((p) => x(p[0]))
        .y((p) => y(p[1] as number))
        .curve(curveMonotoneX)(points) ?? ''

// The chart column's blocks are inset by the tick-label margin, so they cover exactly the panel backgrounds; the
// readout blocks reach across the tick labels to leave a SKELETON_GAP between the two columns. It renders before the
// media query is known, so CSS picks the phone or desktop geometry.
export const MedianOverviewSkeleton = () => (
    <div className={GRID} role="presentation">
        <div className={READOUTS}>
            {DESKTOP.rows.map(({ variable, height }) => (
                <Skeleton
                    key={variable}
                    className="h-[3.5625rem] sm:mr-(--reach) sm:h-(--row-h)"
                    style={{ '--row-h': `${height}px`, '--reach': `${SKELETON_READOUT_REACH}px` } as CSSProperties}
                />
            ))}
        </div>
        <div className="flex flex-col" style={{ gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }}>
            {DESKTOP.rows.map(({ variable, height }, i) => (
                <Skeleton
                    key={variable}
                    className="ml-(--phone-left) h-(--phone-h) sm:ml-(--left) sm:h-(--row-h)"
                    style={
                        {
                            '--row-h': `${height}px`,
                            '--phone-h': `${PHONE.rows[i].height}px`,
                            '--left': `${DESKTOP.marginLeft}px`,
                            '--phone-left': `${PHONE.marginLeft}px`,
                            marginRight: MARGIN_RIGHT,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    </div>
)

interface IProps {
    series: Record<OverviewVariable, MedianSeries>
    directions: (number | null)[] | null
    chance: (number | null)[]
    timeZone: string
    locale: string
    now: Date | null
    ariaLabel: string
}

// Median of all models for every tracked variable on one time axis of 3-hour slots; a precipitation bar is the
// amount of the 3 hours after its slot, and the strip under the bars the share of models above 0.2 mm in it. Readouts on the left follow the crosshair, or the slot nearest to `now`;
// the hovered slot's time sits above the panels. `now` draws the "now" line at the exact current time, which is
// inside the first slot right after a refresh, and shades the past.
export function MedianOverview({ series, directions, chance, timeZone, locale, now, ariaLabel }: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const tcity = useTranslations('city')
    const theme = useChartTheme()
    const isStacked = useMediaQuery(STACKED_QUERY)
    const clipId = useId().replace(/[^\w-]/g, '')

    const { ref, width } = useElementWidth<HTMLDivElement>()
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const geometry = isStacked ? PHONE : DESKTOP
    const axisSteps = series[Variable.Temp].steps
    const times = axisSteps.map((s) => new Date(s))
    const minSlot = getMinSlotWidth(geometry.tickFontSize)
    const contentWidth = getScrollWidth(width, times.length - 1, minSlot, geometry.marginLeft + MARGIN_RIGHT)
    const plotRight = contentWidth - MARGIN_RIGHT
    const x = getTimeScale(times, [geometry.marginLeft, Math.max(geometry.marginLeft + 1, plotRight)])
    // One crosshair for every panel: each reads the slot nearest the pointer (or now), so a precipitation readout is
    // the 3 hours from that slot, which can be the bar after the one under the line (author, 2026-10-09).
    const readoutIndex = hoverIndex ?? (now ? getNearestIndex(times, now) : 0)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = getNowX(x, now, geometry.marginLeft, plotRight)
    const nowLabelY = geometry.isNowLabelAbove ? geometry.plotTop - 7 : geometry.plotTop + geometry.tickFontSize
    const isNowLabelShown = !geometry.isNowLabelAbove || hoverIndex === null
    const barWidth = getBarWidth(x, times[0], SLOT_MS)
    const plotWidth = Math.max(0, contentWidth - geometry.marginLeft - MARGIN_RIGHT)
    const slotWidth = times.length > 1 ? x(times[1]) - x(times[0]) : plotWidth
    const scales = geometry.layout.map((row) => getPanelScale(row, series))
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth,
        insetLeft: geometry.marginLeft,
        contentWidth,
        viewportWidth: width,
    })
    const hoverX =
        hoverIndex === null
            ? null
            : clamp(
                  x(times[hoverIndex]),
                  geometry.marginLeft + geometry.hoverLabelHalfWidth,
                  plotRight - geometry.hoverLabelHalfWidth,
              )

    const { ref: scrollRef, reveal } = useChartScroll(`${axisSteps[0]}|${contentWidth}`, initialScrollLeft, [
        geometry.marginLeft,
        MARGIN_RIGHT,
    ])

    const selectAt = (e: MouseEvent<SVGRectElement>) =>
        setHoverIndex(getNearestIndex(times, getPointerTime(e, x, geometry.marginLeft)))
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
        setHoverIndex(next)
        reveal(x(times[next]))
    }

    return (
        <div className={GRID}>
            <div className={READOUTS}>
                {geometry.layout.map(({ variable, height }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const s = series[variable]
                    const value = getValueAt(s, readoutTime)
                    const isSum = variable === Variable.Precip
                    const secondaryVariable = SECONDARY[variable]
                    const chanceValue = chance[readoutIndex] ?? null
                    const extra = secondaryVariable
                        ? t('secondary', {
                              name: tv(secondaryVariable),
                              value: formatNumber(
                                  getValueAt(series[secondaryVariable], readoutTime),
                                  VARIABLE_BY_ID[secondaryVariable].decimals,
                              ),
                              unit: VARIABLE_BY_ID[secondaryVariable].unit,
                          })
                        : isSum
                          ? t('secondary', {
                                name: tcity('chanceOfRain'),
                                value: formatNumber(chanceValue === null ? null : chanceValue * 100, 0),
                                unit: '%',
                            })
                          : null

                    return (
                        <div
                            key={variable}
                            className="flex flex-col justify-center border-l-2 pl-3 sm:h-(--row-h)"
                            style={{ '--row-h': `${height}px` } as CSSProperties}
                        >
                            <span className="text-xs font-medium text-muted-foreground">{tv(variable)}</span>
                            <span className="text-xl leading-tight font-semibold sm:text-2xl">
                                {formatNumber(value, info.decimals)}
                                <span className="ml-1 text-sm font-normal whitespace-nowrap text-muted-foreground">
                                    {isSum ? t('perSlot', { unit: info.unit, hours: SLOT_HOURS }) : info.unit}
                                </span>
                            </span>
                            {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
                        </div>
                    )
                })}
            </div>
            <div ref={ref} className="relative min-w-0 select-none">
                <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                    <svg
                        width={contentWidth}
                        height={geometry.totalHeight}
                        role="img"
                        aria-label={ariaLabel}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setHoverIndex(null)}
                        onPointerDown={() => setHoverIndex(null)}
                        className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
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
                        {geometry.layout.map(({ variable, bottom }, rowIndex) => {
                            const s = series[variable]
                            const secondaryVariable = SECONDARY[variable]
                            const secondary = secondaryVariable ? series[secondaryVariable] : null
                            const points = toPoints(s)
                            const { y, ticks } = scales[rowIndex]
                            const hoverValue = hoverIndex === null ? null : getValueAt(s, axisSteps[hoverIndex])
                            const hoverSecondary =
                                hoverIndex === null || !secondary ? null : getValueAt(secondary, axisSteps[hoverIndex])

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
                                    {variable === Variable.Precip ? (
                                        points.map((p) => {
                                            const center = x(getSumBarCenter(p[0], SLOT_MS))

                                            if (p[1] === null || center + barWidth / 2 > plotRight) return null

                                            return (
                                                <rect
                                                    key={p[0].toISOString()}
                                                    x={center - barWidth / 2}
                                                    y={y(p[1])}
                                                    width={barWidth}
                                                    height={Math.max(0, bottom - y(p[1]))}
                                                    rx={2}
                                                    fill={theme.band}
                                                    opacity={0.75}
                                                />
                                            )
                                        })
                                    ) : (
                                        <>
                                            <path
                                                d={getAreaPath(points, x, y, bottom)}
                                                fill={theme.band}
                                                opacity={theme.bandOuterOpacity}
                                            />
                                            <path
                                                d={getLinePath(points, x, y)}
                                                fill="none"
                                                stroke={theme.median}
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                            />
                                            {secondary && (
                                                <path
                                                    d={getLinePath(toPoints(secondary), x, y)}
                                                    fill="none"
                                                    stroke={theme.median}
                                                    strokeWidth={1.5}
                                                    strokeDasharray={SECONDARY_DASH}
                                                    opacity={0.7}
                                                />
                                            )}
                                        </>
                                    )}
                                    {variable === Variable.Precip && (
                                        <g aria-hidden="true">
                                            {chance.map((c, i) => {
                                                const center = x(getSumBarCenter(times[i], SLOT_MS))
                                                const isShown = c !== null && center + barWidth / 2 <= plotRight

                                                return (
                                                    isShown && (
                                                        <text
                                                            key={axisSteps[i]}
                                                            x={center}
                                                            y={bottom + CHANCE_STRIP / 2}
                                                            dy="0.32em"
                                                            textAnchor="middle"
                                                            fontSize={geometry.tickFontSize}
                                                            fontWeight={c >= 0.5 ? 600 : 400}
                                                            fill={c >= 0.5 ? theme.foreground : theme.muted}
                                                        >
                                                            {Math.round(c * 100)}
                                                        </text>
                                                    )
                                                )
                                            })}
                                        </g>
                                    )}
                                    {variable === Variable.Wind && directions && (
                                        <WindArrows
                                            x={x}
                                            times={times}
                                            directions={directions}
                                            y={bottom + ARROW_STRIP / 2 + 2}
                                            color={theme.foreground}
                                            mutedColor={theme.muted}
                                            compassLabels={tc('compass').split(',')}
                                        />
                                    )}
                                    {hoverIndex !== null &&
                                        hoverValue !== null &&
                                        hoverValue !== undefined &&
                                        variable !== Variable.Precip && (
                                            <circle
                                                cx={x(times[hoverIndex])}
                                                cy={y(hoverValue)}
                                                r={4}
                                                fill={theme.median}
                                                stroke={theme.card}
                                                strokeWidth={2}
                                                pointerEvents="none"
                                            />
                                        )}
                                    {hoverIndex !== null && hoverSecondary !== null && (
                                        <circle
                                            cx={x(times[hoverIndex])}
                                            cy={y(hoverSecondary)}
                                            r={3}
                                            fill={theme.card}
                                            stroke={theme.median}
                                            strokeWidth={1.5}
                                            pointerEvents="none"
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
                            labelYs={[geometry.plotBottom + 5 + geometry.labelFontSize]}
                            fontSize={geometry.labelFontSize}
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
                                {isNowLabelShown && (
                                    <text
                                        x={nowX + 4}
                                        y={nowLabelY}
                                        fontSize={geometry.tickFontSize}
                                        fontWeight={600}
                                        fill={theme.foreground}
                                    >
                                        {tc('now')}
                                    </text>
                                )}
                            </g>
                        )}
                        {hoverIndex !== null && hoverX !== null && (
                            <text
                                x={hoverX}
                                y={geometry.plotTop - 7}
                                textAnchor="middle"
                                fontSize={geometry.labelFontSize}
                                fontWeight={600}
                                fill={theme.foreground}
                                pointerEvents="none"
                            >
                                {formatStepLabel(axisSteps[hoverIndex], timeZone, locale)}
                            </text>
                        )}
                        {hoverIndex !== null &&
                            geometry.spans.map(({ top, bottom }) => (
                                <line
                                    key={top}
                                    x1={x(times[hoverIndex])}
                                    x2={x(times[hoverIndex])}
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
                {/* The axis stays while the plot scrolls under it: the tick labels on a card-coloured column, and on
                    phones the panel names in the panels' corners. */}
                <svg
                    width={width}
                    height={geometry.totalHeight}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0"
                >
                    <rect width={geometry.marginLeft} height={geometry.totalHeight} fill={theme.card} />
                    {geometry.layout.map(({ variable, bottom }, rowIndex) => (
                        <g key={variable}>
                            {scales[rowIndex].ticks.map((tick) => (
                                <text
                                    key={tick}
                                    x={geometry.marginLeft - 6}
                                    y={scales[rowIndex].y(tick)}
                                    dy="0.32em"
                                    textAnchor="end"
                                    fontSize={geometry.tickFontSize}
                                    fill={theme.muted}
                                >
                                    {formatYTick(tick)}
                                </text>
                            ))}
                            {variable === Variable.Precip && (
                                <text
                                    x={geometry.marginLeft - 6}
                                    y={bottom + CHANCE_STRIP / 2}
                                    dy="0.32em"
                                    textAnchor="end"
                                    fontSize={geometry.tickFontSize}
                                    fill={theme.muted}
                                >
                                    %
                                </text>
                            )}
                        </g>
                    ))}
                    {isStacked &&
                        geometry.layout.map(({ variable, top }) => (
                            <text
                                key={variable}
                                x={geometry.marginLeft + 6}
                                y={top + geometry.tickFontSize + 2}
                                fontSize={geometry.tickFontSize}
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
