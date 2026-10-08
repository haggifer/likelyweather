'use client'

import { useChartTheme } from '@/hooks/useChartTheme'
import { useElementWidth } from '@/hooks/useElementWidth'
import { clamp, getBarWidth, getNowX, getTimeScale, getValueScale } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import { getNearestIndex, getSumBarCenter } from '@fa/chart-core/spaghetti-geometry'
import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Skeleton } from '@fa/ui/components/skeleton'
import { useMediaQuery } from '@fa/ui/hooks/useMediaQuery'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { useTranslations } from 'next-intl'
import { CSSProperties, KeyboardEvent, PointerEvent, useId, useState } from 'react'
import { getArrowStep } from './arrow-keys'
import { DayGrid } from './DayGrid'
import { getPointerTime } from './pointer-time'
import { WindArrows } from './WindArrows'

export interface MedianSeries {
    steps: string[]
    values: (number | null)[]
}

interface RowLayout {
    variable: Variable
    top: number
    bottom: number
    height: number
}

type Point = [Date, number | null]

const ROWS: { variable: Variable; height: number }[] = [
    { variable: Variable.Temp, height: 104 },
    { variable: Variable.Wind, height: 100 },
    { variable: Variable.Pressure, height: 80 },
    { variable: Variable.Precip, height: 80 },
]
const ROW_GAP = 14
const ROW_PAD = 6
const ARROW_STRIP = 20
const HOVER_STRIP = 20
const AXIS_HEIGHT = 22
const MARGIN = { left: 36, right: 8 }
const PANEL_RADIUS = 4
const HOVER_LABEL_HALF_WIDTH = 34
const SLOT_MS = SLOT_HOURS * HOUR_MS
const SUMMARY_HOURS = 24
// Phones stack the readouts in a 2 × 2 grid above a full-width chart; from `sm` they form a column beside it, one
// per panel. The column's gap and padding match ROW_GAP, HOVER_STRIP and AXIS_HEIGHT.
const GRID = 'grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:gap-x-4'
const READOUTS = 'grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3.5 sm:pt-5 sm:pb-5.5'
const STACKED_QUERY = '(width < 40rem)'
const COLUMN_GAP = 16
const SKELETON_GAP = 24
const SKELETON_READOUT_REACH = SKELETON_GAP - COLUMN_GAP - MARGIN.left

const LAYOUT: RowLayout[] = ROWS.reduce<RowLayout[]>((rows, row) => {
    const top = rows.length ? rows[rows.length - 1].top + rows[rows.length - 1].height + ROW_GAP : HOVER_STRIP
    const strip = row.variable === Variable.Wind ? ARROW_STRIP : 0

    return [...rows, { variable: row.variable, top, height: row.height, bottom: top + row.height - ROW_PAD - strip }]
}, [])
const PLOT_TOP = LAYOUT[0].top
const PLOT_BOTTOM = LAYOUT[LAYOUT.length - 1].top + LAYOUT[LAYOUT.length - 1].height
const TOTAL_HEIGHT = PLOT_BOTTOM + AXIS_HEIGHT
const SPANS = LAYOUT.map(({ top, height }) => ({ top, bottom: top + height }))

const isDefined = (p: Point) => p[1] !== null

const getSummaryValues = (s: MedianSeries, from: Date) => {
    const to = from.getTime() + SUMMARY_HOURS * HOUR_MS

    return s.values.filter((v, i): v is number => {
        const t = new Date(s.steps[i]).getTime()

        return v !== null && t >= from.getTime() && t < to
    })
}

const getSlotCount = (s: MedianSeries) =>
    s.steps.length > 1
        ? (SUMMARY_HOURS * HOUR_MS) / (new Date(s.steps[1]).getTime() - new Date(s.steps[0]).getTime())
        : Infinity

// A total over fewer slots than the window holds (an old run served without a refresh ends early) would read as a
// drier forecast than it is, so it is shown as unknown.
const formatTotal = (values: number[], slotCount: number) =>
    formatNumber(values.length >= slotCount ? values.reduce((sum, v) => sum + v, 0) : null, 1)

const formatRange = (values: number[], decimals: number) => ({
    min: formatNumber(values.length ? Math.min(...values) : null, decimals),
    max: formatNumber(values.length ? Math.max(...values) : null, decimals),
})

const getValueAt = (s: MedianSeries, step: string) => {
    const index = s.steps.indexOf(step)

    return index >= 0 ? s.values[index] : null
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
// readout blocks reach across the tick labels to leave a SKELETON_GAP between the two columns.
export const MedianOverviewSkeleton = () => (
    <div className={GRID} role="presentation">
        <div className={READOUTS}>
            {ROWS.map(({ variable, height }) => (
                <Skeleton
                    key={variable}
                    className="h-18 sm:mr-(--reach) sm:h-(--row-h)"
                    style={{ '--row-h': `${height}px`, '--reach': `${SKELETON_READOUT_REACH}px` } as CSSProperties}
                />
            ))}
        </div>
        <div className="flex flex-col" style={{ gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }}>
            {ROWS.map(({ variable, height }) => (
                <Skeleton key={variable} style={{ height, marginLeft: MARGIN.left, marginRight: MARGIN.right }} />
            ))}
        </div>
    </div>
)

interface IProps {
    series: Record<Variable, MedianSeries>
    directions: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date | null
    summaryStart: Date
    ariaLabel: string
}

// Median of all models for every tracked variable on one time axis of 3-hour slots; a precipitation bar is the
// amount of the 3 hours after its slot. Readouts on the left follow the crosshair, or the slot nearest to `now`;
// the hovered slot's time sits above the panels. `now` draws the "now" line at the exact current time, which is
// inside the first slot right after a refresh, and shades the past.
export function MedianOverview({ series, directions, timeZone, locale, now, summaryStart, ariaLabel }: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const theme = useChartTheme()
    const isStacked = useMediaQuery(STACKED_QUERY)
    const clipId = useId().replace(/[^\w-]/g, '')

    const { ref, width } = useElementWidth<HTMLDivElement>()
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const axisSteps = series[Variable.Temp].steps
    const times = axisSteps.map((s) => new Date(s))
    const plotRight = width - MARGIN.right
    const x = getTimeScale(times, [MARGIN.left, Math.max(MARGIN.left + 1, plotRight)])
    const readoutIndex = hoverIndex ?? (now ? getNearestIndex(times, now) : 0)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = getNowX(x, now, MARGIN.left, plotRight)
    const barWidth = getBarWidth(x, times[0], SLOT_MS)
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
    const hoverX =
        hoverIndex === null
            ? null
            : clamp(x(times[hoverIndex]), MARGIN.left + HOVER_LABEL_HALF_WIDTH, plotRight - HOVER_LABEL_HALF_WIDTH)

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) =>
        setHoverIndex(getNearestIndex(times, getPointerTime(e, x, MARGIN.left)))

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        const step = getArrowStep(e.key)

        if (!step) return

        e.preventDefault()
        setHoverIndex(clamp(readoutIndex + step, 0, times.length - 1))
    }

    return (
        <div className={GRID}>
            <div className={READOUTS}>
                {LAYOUT.map(({ variable, height }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const s = series[variable]
                    const value = getValueAt(s, readoutTime)
                    const isSum = variable === Variable.Precip
                    const upcoming = getSummaryValues(s, summaryStart)
                    const summary = isSum
                        ? t('total', { value: formatTotal(upcoming, getSlotCount(s)), unit: info.unit })
                        : t('range', { ...formatRange(upcoming, info.decimals), unit: info.unit })

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
                            <span className="text-[0.6875rem] text-muted-foreground">{summary}</span>
                        </div>
                    )
                })}
            </div>
            <div ref={ref} className="relative min-w-0 select-none">
                <svg
                    width={width}
                    height={TOTAL_HEIGHT}
                    role="img"
                    aria-label={ariaLabel}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setHoverIndex(null)}
                    className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <defs>
                        {SPANS.map(({ top, bottom }, i) => (
                            <clipPath key={top} id={`${clipId}-${i}`}>
                                <rect
                                    x={MARGIN.left}
                                    y={top}
                                    width={plotWidth}
                                    height={bottom - top}
                                    rx={PANEL_RADIUS}
                                />
                            </clipPath>
                        ))}
                    </defs>
                    {SPANS.map(({ top, bottom }) => (
                        <rect
                            key={top}
                            x={MARGIN.left}
                            y={top}
                            width={plotWidth}
                            height={bottom - top}
                            rx={PANEL_RADIUS}
                            fill={theme.grid}
                            opacity={0.4}
                        />
                    ))}
                    {nowX !== null &&
                        SPANS.map(({ top, bottom }, i) => (
                            <rect
                                key={top}
                                x={MARGIN.left}
                                y={top}
                                width={Math.max(0, nowX - MARGIN.left)}
                                height={bottom - top}
                                fill={theme.grid}
                                opacity={0.6}
                                clipPath={`url(#${clipId}-${i})`}
                            />
                        ))}
                    {LAYOUT.map(({ variable, top, bottom }) => {
                        const s = series[variable]
                        const points = toPoints(s)
                        const domain = getYDomain(s.values, variable)
                        const y = getValueScale(domain, [bottom, top + ROW_PAD])
                        const hoverValue = hoverIndex === null ? null : getValueAt(s, axisSteps[hoverIndex])

                        return (
                            <g key={variable}>
                                {getYTicks(domain, variable, 3).map((tick) => (
                                    <g key={tick}>
                                        <line
                                            x1={MARGIN.left}
                                            x2={plotRight}
                                            y1={y(tick)}
                                            y2={y(tick)}
                                            stroke={theme.grid}
                                        />
                                        <text
                                            x={MARGIN.left - 6}
                                            y={y(tick)}
                                            dy="0.32em"
                                            textAnchor="end"
                                            fontSize={10}
                                            fill={theme.muted}
                                        >
                                            {formatYTick(tick)}
                                        </text>
                                    </g>
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
                                    </>
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
                            </g>
                        )
                    })}
                    <DayGrid
                        x={x}
                        start={times[0]}
                        end={times[times.length - 1]}
                        timeZone={timeZone}
                        locale={locale}
                        spans={SPANS}
                        labelYs={[PLOT_BOTTOM + 16]}
                        lineColor={theme.border}
                        labelColor={theme.muted}
                    />
                    {nowX !== null && (
                        <g pointerEvents="none">
                            {SPANS.map(({ top, bottom }) => (
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
                            <text x={nowX + 4} y={PLOT_TOP + 10} fontSize={10} fontWeight={600} fill={theme.foreground}>
                                {tc('now')}
                            </text>
                        </g>
                    )}
                    {hoverIndex !== null && hoverX !== null && (
                        <text
                            x={hoverX}
                            y={PLOT_TOP - 7}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={600}
                            fill={theme.foreground}
                            pointerEvents="none"
                        >
                            {formatStepLabel(axisSteps[hoverIndex], timeZone, locale)}
                        </text>
                    )}
                    {hoverIndex !== null &&
                        SPANS.map(({ top, bottom }) => (
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
                    {isStacked &&
                        LAYOUT.map(({ variable, top }) => (
                            <text
                                key={variable}
                                x={MARGIN.left + 6}
                                y={top + 12}
                                fontSize={10}
                                fontWeight={600}
                                fill={theme.muted}
                                stroke={theme.card}
                                strokeWidth={3}
                                paintOrder="stroke"
                                pointerEvents="none"
                            >
                                {tv(variable)}, {VARIABLE_BY_ID[variable].unit}
                            </text>
                        ))}
                    <rect
                        x={MARGIN.left}
                        y={PLOT_TOP}
                        width={plotWidth}
                        height={PLOT_BOTTOM - PLOT_TOP}
                        fill="transparent"
                        style={{ touchAction: 'pan-y' }}
                        onPointerDown={handlePointerMove}
                        onPointerMove={handlePointerMove}
                        onPointerLeave={() => setHoverIndex(null)}
                    />
                </svg>
            </div>
        </div>
    )
}
