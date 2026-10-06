import { clamp, getBarWidth, getNowX, getTimeScale, getValueScale } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import { getNearestIndex, getSumBarCenter } from '@fa/chart-core/spaghetti-geometry'
import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { useId, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useTheme } from '../../hooks/useTheme'
import { DayGrid } from './DayGrid'
import { ScrubSurface } from './ScrubSurface'
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

// The web's phone layout: readouts in a 2 × 2 grid above, four stacked panels below, each named inside its panel.
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

const LAYOUT: RowLayout[] = ROWS.reduce<RowLayout[]>((rows, row) => {
    const previous = rows[rows.length - 1]
    const top = previous ? previous.top + previous.height + ROW_GAP : HOVER_STRIP
    const strip = row.variable === Variable.Wind ? ARROW_STRIP : 0

    return [...rows, { variable: row.variable, top, height: row.height, bottom: top + row.height - ROW_PAD - strip }]
}, [])
const PLOT_TOP = LAYOUT[0].top
const PLOT_BOTTOM = LAYOUT[LAYOUT.length - 1].top + LAYOUT[LAYOUT.length - 1].height
const TOTAL_HEIGHT = PLOT_BOTTOM + AXIS_HEIGHT
const SPANS = LAYOUT.map(({ top, height }) => ({ top, bottom: top + height }))

const styles = StyleSheet.create({
    readouts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 8 },
    readout: { width: '50%', borderLeftWidth: 2, paddingLeft: 10, paddingRight: 4 },
    label: { fontSize: 12, fontWeight: '500' },
    value: { fontSize: 20, fontWeight: '600' },
    unit: { fontSize: 13, fontWeight: '400' },
    summary: { fontSize: 11 },
})

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

// A total over fewer slots than the window holds would read as a drier forecast than it is, so it shows as unknown.
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

interface IProps {
    series: Record<Variable, MedianSeries>
    directions: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date
    summaryStart: Date
    accessibilityLabel: string
}

// Median of all models for every variable on one axis of local 3-hour slots; a precipitation bar is the amount of
// the 3 hours after its slot. The readouts follow the finger, or the slot nearest to now.
export function MedianOverview({
    series,
    directions,
    timeZone,
    locale,
    now,
    summaryStart,
    accessibilityLabel,
}: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const { chart, colors } = useTheme()
    const { width, onLayout } = useLayoutWidth()
    const clipId = useId().replace(/[^\w-]/g, '')

    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const axisSteps = series[Variable.Temp].steps
    const times = axisSteps.map((s) => new Date(s))
    const plotRight = width - MARGIN.right
    const x = getTimeScale(times, [MARGIN.left, Math.max(MARGIN.left + 1, plotRight)])
    const readoutIndex = hoverIndex ?? getNearestIndex(times, now)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = getNowX(x, now, MARGIN.left, plotRight)
    const barWidth = getBarWidth(x, times[0], SLOT_MS)
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
    const hoverX =
        hoverIndex === null
            ? null
            : clamp(x(times[hoverIndex]), MARGIN.left + HOVER_LABEL_HALF_WIDTH, plotRight - HOVER_LABEL_HALF_WIDTH)

    const handleScrub = (touchX: number) => setHoverIndex(getNearestIndex(times, x.invert(touchX)))

    return (
        <View>
            <View style={styles.readouts}>
                {LAYOUT.map(({ variable }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const s = series[variable]
                    const isSum = variable === Variable.Precip
                    const upcoming = getSummaryValues(s, summaryStart)
                    const summary = isSum
                        ? t('total', { value: formatTotal(upcoming, getSlotCount(s)), unit: info.unit })
                        : t('range', { ...formatRange(upcoming, info.decimals), unit: info.unit })

                    return (
                        <View key={variable} style={[styles.readout, { borderLeftColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors['muted-foreground'] }]}>{tv(variable)}</Text>
                            <Text style={[styles.value, { color: colors.foreground }]}>
                                {formatNumber(getValueAt(s, readoutTime), info.decimals)}
                                <Text style={[styles.unit, { color: colors['muted-foreground'] }]}>
                                    {' '}
                                    {isSum ? t('perSlot', { unit: info.unit, hours: SLOT_HOURS }) : info.unit}
                                </Text>
                            </Text>
                            <Text style={[styles.summary, { color: colors['muted-foreground'] }]}>{summary}</Text>
                        </View>
                    )
                })}
            </View>
            <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
                {width > 0 && (
                    <ScrubSurface onScrub={handleScrub}>
                        <Svg width={width} height={TOTAL_HEIGHT}>
                            <Defs>
                                {SPANS.map(({ top, bottom }, i) => (
                                    <ClipPath key={top} id={`${clipId}-${i}`}>
                                        <Rect
                                            x={MARGIN.left}
                                            y={top}
                                            width={plotWidth}
                                            height={bottom - top}
                                            rx={PANEL_RADIUS}
                                        />
                                    </ClipPath>
                                ))}
                            </Defs>
                            {SPANS.map(({ top, bottom }) => (
                                <Rect
                                    key={top}
                                    x={MARGIN.left}
                                    y={top}
                                    width={plotWidth}
                                    height={bottom - top}
                                    rx={PANEL_RADIUS}
                                    fill={chart.grid}
                                    opacity={0.4}
                                />
                            ))}
                            {nowX !== null &&
                                SPANS.map(({ top, bottom }, i) => (
                                    <Rect
                                        key={top}
                                        x={MARGIN.left}
                                        y={top}
                                        width={Math.max(0, nowX - MARGIN.left)}
                                        height={bottom - top}
                                        fill={chart.grid}
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
                                    <G key={variable}>
                                        {getYTicks(domain, variable, 3).map((tick) => (
                                            <G key={tick}>
                                                <Line
                                                    x1={MARGIN.left}
                                                    x2={plotRight}
                                                    y1={y(tick)}
                                                    y2={y(tick)}
                                                    stroke={chart.grid}
                                                />
                                                <SvgText
                                                    x={MARGIN.left - 6}
                                                    y={y(tick) + 3.5}
                                                    textAnchor="end"
                                                    fontSize={10}
                                                    fill={chart.muted}
                                                >
                                                    {formatYTick(tick)}
                                                </SvgText>
                                            </G>
                                        ))}
                                        {variable === Variable.Precip ? (
                                            points.map((p) => {
                                                const center = x(getSumBarCenter(p[0], SLOT_MS))

                                                if (p[1] === null || center + barWidth / 2 > plotRight) return null

                                                return (
                                                    <Rect
                                                        key={p[0].toISOString()}
                                                        x={center - barWidth / 2}
                                                        y={y(p[1])}
                                                        width={barWidth}
                                                        height={Math.max(0, bottom - y(p[1]))}
                                                        rx={2}
                                                        fill={chart.band}
                                                        opacity={0.75}
                                                    />
                                                )
                                            })
                                        ) : (
                                            <G>
                                                <Path
                                                    d={getAreaPath(points, x, y, bottom)}
                                                    fill={chart.band}
                                                    opacity={chart.bandOuterOpacity}
                                                />
                                                <Path
                                                    d={getLinePath(points, x, y)}
                                                    fill="none"
                                                    stroke={chart.median}
                                                    strokeWidth={2}
                                                    strokeLinecap="round"
                                                />
                                            </G>
                                        )}
                                        {variable === Variable.Wind && directions && (
                                            <WindArrows
                                                x={x}
                                                times={times}
                                                directions={directions}
                                                y={bottom + ARROW_STRIP / 2 + 2}
                                                color={chart.foreground}
                                                mutedColor={chart.muted}
                                            />
                                        )}
                                        {hoverIndex !== null &&
                                            hoverValue !== null &&
                                            hoverValue !== undefined &&
                                            variable !== Variable.Precip && (
                                                <Circle
                                                    cx={x(times[hoverIndex])}
                                                    cy={y(hoverValue)}
                                                    r={4}
                                                    fill={chart.median}
                                                    stroke={chart.card}
                                                    strokeWidth={2}
                                                />
                                            )}
                                        <SvgText
                                            x={MARGIN.left + 6}
                                            y={top + 12}
                                            fontSize={10}
                                            fontWeight="600"
                                            fill={chart.muted}
                                        >
                                            {`${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}`}
                                        </SvgText>
                                    </G>
                                )
                            })}
                            <DayGrid
                                x={x}
                                start={times[0]}
                                end={times[times.length - 1]}
                                timeZone={timeZone}
                                locale={locale}
                                spans={SPANS}
                                labelY={PLOT_BOTTOM + 16}
                                lineColor={chart.border}
                                labelColor={chart.muted}
                            />
                            {nowX !== null && (
                                <G>
                                    {SPANS.map(({ top, bottom }) => (
                                        <Line
                                            key={top}
                                            x1={nowX}
                                            x2={nowX}
                                            y1={top}
                                            y2={bottom}
                                            stroke={chart.foreground}
                                            strokeDasharray="4 3"
                                        />
                                    ))}
                                    <SvgText
                                        x={nowX + 4}
                                        y={PLOT_TOP - 6}
                                        fontSize={10}
                                        fontWeight="600"
                                        fill={chart.foreground}
                                    >
                                        {hoverIndex === null ? tc('now') : ''}
                                    </SvgText>
                                </G>
                            )}
                            {hoverIndex !== null && hoverX !== null && (
                                <G>
                                    <SvgText
                                        x={hoverX}
                                        y={PLOT_TOP - 7}
                                        textAnchor="middle"
                                        fontSize={11}
                                        fontWeight="600"
                                        fill={chart.foreground}
                                    >
                                        {formatStepLabel(axisSteps[hoverIndex], timeZone, locale)}
                                    </SvgText>
                                    {SPANS.map(({ top, bottom }) => (
                                        <Line
                                            key={top}
                                            x1={x(times[hoverIndex])}
                                            x2={x(times[hoverIndex])}
                                            y1={top}
                                            y2={bottom}
                                            stroke={chart.muted}
                                        />
                                    ))}
                                </G>
                            )}
                        </Svg>
                    </ScrubSurface>
                )}
                {width === 0 && <View style={{ height: TOTAL_HEIGHT }} />}
            </View>
        </View>
    )
}
