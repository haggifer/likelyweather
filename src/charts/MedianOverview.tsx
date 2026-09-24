'use client'

import DayGrid from '@/charts/DayGrid'
import { getYDomain, getYTicks } from '@/charts/scales'
import { getNearestIndex } from '@/charts/spaghettiGeometry'
import useChartTheme from '@/charts/useChartTheme'
import useElementWidth from '@/charts/useElementWidth'
import WindArrows from '@/charts/WindArrows'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatStepLabel } from '@/lib/format'
import { HOUR_MS } from '@/shared/constants'
import { SLOT_HOURS } from '@/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { useTranslations } from 'next-intl'
import { KeyboardEvent, PointerEvent, useId, useState } from 'react'

export interface MedianSeries {
    steps: string[]
    values: (number | null)[]
}

interface IProps {
    series: Record<Variable, MedianSeries>
    directions: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date | null
    summaryStart: Date
    ariaLabel: string
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
const BAR_RATIO = 0.62
const SUMMARY_HOURS = 24
const GRID = 'grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]'
const COLUMN_GAP = 16
const SKELETON_GAP = 24

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

// The chart column's blocks are inset by the tick-label margin, so they cover exactly the panel backgrounds; the
// readout blocks reach across the tick labels to leave a SKELETON_GAP between the two columns.
export const MedianOverviewSkeleton = () => (
    <div className={GRID} style={{ columnGap: COLUMN_GAP }} role="presentation">
        {[{ left: 0, right: SKELETON_GAP - COLUMN_GAP - MARGIN.left }, MARGIN].map((inset, column) => (
            <div
                key={column}
                className="flex flex-col"
                style={{ gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }}
            >
                {ROWS.map(({ variable, height }) => (
                    <Skeleton key={variable} style={{ height, marginLeft: inset.left, marginRight: inset.right }} />
                ))}
            </div>
        ))}
    </div>
)

// Median of all models for every tracked variable on one time axis of 3-hour slots; a precipitation bar is the
// amount of the 3 hours after its slot. Readouts on the left follow the crosshair, or the first slot while the
// chart is fresh; the hovered slot's time sits above the panels. `now` is set only once the chart has gone
// stale: it draws the "now" line and shades the past.
export default function MedianOverview({ series, directions, timeZone, locale, now, summaryStart, ariaLabel }: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const theme = useChartTheme()
    const { ref, width } = useElementWidth<HTMLDivElement>()
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const clipId = useId().replace(/[^\w-]/g, '')
    const axisSteps = series[Variable.Temp].steps
    const times = axisSteps.map((s) => new Date(s))
    const x = scaleUtc()
        .domain([times[0], times[times.length - 1]])
        .range([MARGIN.left, Math.max(MARGIN.left + 1, width - MARGIN.right)])
    const readoutIndex = hoverIndex ?? (now ? getNearestIndex(times, now) : 0)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = now ? Math.max(MARGIN.left, Math.min(width - MARGIN.right, x(now))) : null
    const barWidth = Math.max(2, (x(new Date(times[0].getTime() + SLOT_HOURS * HOUR_MS)) - x(times[0])) * BAR_RATIO)
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
    const hoverX =
        hoverIndex === null
            ? null
            : Math.max(
                  MARGIN.left + HOVER_LABEL_HALF_WIDTH,
                  Math.min(width - MARGIN.right - HOVER_LABEL_HALF_WIDTH, x(times[hoverIndex])),
              )

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        const box = e.currentTarget.getBoundingClientRect()
        setHoverIndex(getNearestIndex(times, x.invert(e.clientX - box.left + MARGIN.left)))
    }

    const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

        e.preventDefault()
        setHoverIndex(Math.max(0, Math.min(times.length - 1, readoutIndex + (e.key === 'ArrowRight' ? 1 : -1))))
    }

    return (
        <div className={GRID} style={{ columnGap: COLUMN_GAP }}>
            <div
                className="flex flex-col"
                style={{ gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }}
            >
                {LAYOUT.map(({ variable, height }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const s = series[variable]
                    const index = s.steps.indexOf(readoutTime)
                    const value = index >= 0 ? s.values[index] : null
                    const isSum = variable === Variable.Precip
                    const upcoming = getSummaryValues(s, summaryStart)
                    const summary = isSum
                        ? t('total', {
                              value: formatNumber(
                                  upcoming.reduce((sum, v) => sum + v, 0),
                                  1,
                              ),
                              unit: info.unit,
                          })
                        : t('range', {
                              min: formatNumber(upcoming.length ? Math.min(...upcoming) : null, info.decimals),
                              max: formatNumber(upcoming.length ? Math.max(...upcoming) : null, info.decimals),
                              unit: info.unit,
                          })

                    return (
                        <div key={variable} className="flex flex-col justify-center border-l-2 pl-3" style={{ height }}>
                            <span className="text-xs font-medium text-muted-foreground">{tv(variable)}</span>
                            <span className="text-2xl leading-tight font-semibold">
                                {formatNumber(value, info.decimals)}
                                <span className="ml-1 text-sm font-normal whitespace-nowrap text-muted-foreground">
                                    {isSum ? t('perSlot', { unit: info.unit, hours: SLOT_HOURS }) : info.unit}
                                </span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">{summary}</span>
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
                        const points: Point[] = s.steps.map((step, i) => [new Date(step), s.values[i]])
                        const domain = getYDomain(s.values, variable)
                        const y = scaleLinear()
                            .domain(domain)
                            .range([bottom, top + ROW_PAD])
                        const toX = (p: Point) => x(p[0])
                        const toY = (p: Point) => y(p[1] as number)
                        const hoverValue = hoverIndex === null ? null : s.values[s.steps.indexOf(axisSteps[hoverIndex])]

                        return (
                            <g key={variable}>
                                {getYTicks(domain, variable, 3).map((tick) => (
                                    <g key={tick}>
                                        <line
                                            x1={MARGIN.left}
                                            x2={width - MARGIN.right}
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
                                            {formatNumber(tick, Number.isInteger(tick) ? 0 : 1)}
                                        </text>
                                    </g>
                                ))}
                                {variable === Variable.Precip ? (
                                    points.map((p) => {
                                        const center = x(new Date(p[0].getTime() + (SLOT_HOURS / 2) * HOUR_MS))

                                        if (p[1] === null || center + barWidth / 2 > width - MARGIN.right) return null

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
                                            d={
                                                area<Point>()
                                                    .defined(isDefined)
                                                    .x(toX)
                                                    .y0(bottom)
                                                    .y1(toY)
                                                    .curve(curveMonotoneX)(points) ?? ''
                                            }
                                            fill={theme.band}
                                            opacity={theme.bandOuterOpacity}
                                        />
                                        <path
                                            d={
                                                line<Point>().defined(isDefined).x(toX).y(toY).curve(curveMonotoneX)(
                                                    points,
                                                ) ?? ''
                                            }
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
                    <rect
                        x={MARGIN.left}
                        y={PLOT_TOP}
                        width={plotWidth}
                        height={PLOT_BOTTOM - PLOT_TOP}
                        fill="transparent"
                        onPointerMove={handlePointerMove}
                        onPointerLeave={() => setHoverIndex(null)}
                    />
                </svg>
            </div>
        </div>
    )
}
