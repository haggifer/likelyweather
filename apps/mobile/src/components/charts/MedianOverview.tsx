import { MedianSeries, OverviewMedians } from '@fa/chart-core/overview-stats'
import { CHART_FONT_SIZE, clamp, getBarWidth, getNowX, getTimeScale, getValueScale } from '@fa/chart-core/plot-geometry'
import { formatYTick, getPanelTicks, getYDomain } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getScrollWidth, getVisibleRange, MIN_SLOT_WIDTH } from '@fa/chart-core/scroll-geometry'
import { getNearestIndex, getSumBarCenter } from '@fa/chart-core/spaghetti-geometry'
import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { PanelVariable, SECONDARY_VARIABLE } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { memo, useId, useMemo, useState } from 'react'
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useTheme } from '../../hooks/useTheme'
import { getFontFamily } from '../../theme/fonts'
import { Skeleton } from '../ui/Skeleton'
import { Text } from '../ui/Text'
import { ChanceStrip } from './ChanceStrip'
import { DayGrid } from './DayGrid'
import { TapSurface } from './TapSurface'
import { WindArrows } from './WindArrows'

interface RowLayout {
    variable: PanelVariable
    top: number
    bottom: number
    height: number
}

interface PanelSpan {
    top: number
    bottom: number
}

interface ChartLayout {
    rows: RowLayout[]
    spans: PanelSpan[]
    plotTop: number
    plotBottom: number
    totalHeight: number
}

type Point = [Date, number | null]

interface ExtraReadout {
    variable: OverviewVariable | null
    value: string
    unit: string
}

interface PanelScale {
    y: ScaleLinear<number, number>
    ticks: number[]
}

interface HoverDot {
    key: string
    cy: number
    isSecondary: boolean
}

// The web's phone layout: readouts in a two-column grid above, the reader's panels stacked below in the same order,
// each named inside its panel.
const PANEL_HEIGHT: Record<PanelVariable, number> = {
    [Variable.Temp]: 104,
    [Variable.Wind]: 100,
    [Variable.Pressure]: 80,
    [Variable.Precip]: 80 + 18,
    [Variable.Humidity]: 80,
    [Variable.Cloud]: 80,
}
const ROW_GAP = 14
const ROW_PAD = 6
const ARROW_STRIP = 20
// The chance of rain sits under the precipitation bars like the direction arrows under the wind; the panel's height
// above includes it, so the bars keep their room.
const CHANCE_STRIP = 18
// Feels-like and gusts are drawn as a second, dashed line in the panel of the variable they belong to.
const SECONDARY_DASH = '5 3'
const HOVER_STRIP = 20
const AXIS_HEIGHT = 22
const MARGIN = { left: 36, right: 8 }
const PANEL_RADIUS = 4
const HOVER_LABEL_HALF_WIDTH = 34
const SCROLL_THROTTLE_MS = 100
const SLOT_MS = SLOT_HOURS * HOUR_MS
// Half the cap height of the tick font, so a label centres on its gridline.
const BASELINE_SHIFT = 3.5
const NO_BREAK_SPACE = ' '
const NO_SERIES: MedianSeries = { steps: [], values: [] }

const styles = StyleSheet.create({
    readouts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8, marginBottom: 8 },
    // Two equal columns with the gap between them; an odd last readout keeps to its column.
    readout: { flexBasis: '40%', flexGrow: 1, maxWidth: '50%', borderLeftWidth: 2, paddingLeft: 10, paddingRight: 4 },
    skeletonLine: { position: 'absolute', top: 2, bottom: 2 },
    label: { fontSize: 12, fontWeight: '500' },
    value: { fontSize: 20, fontWeight: '600' },
    unit: { fontSize: 14, fontWeight: '400' },
    extra: { fontSize: 12 },
})

const getStripHeight = (variable: PanelVariable) =>
    variable === Variable.Wind ? ARROW_STRIP : variable === Variable.Precip ? CHANCE_STRIP : 0

const toRows = (panels: PanelVariable[]) =>
    panels.reduce<RowLayout[]>((rows, variable) => {
        const previous = rows[rows.length - 1]
        const top = previous ? previous.top + previous.height + ROW_GAP : HOVER_STRIP
        const height = PANEL_HEIGHT[variable]

        return [...rows, { variable, top, height, bottom: top + height - ROW_PAD - getStripHeight(variable) }]
    }, [])

// The hover time strip sits above the first panel and the day labels under the last, whichever they are.
const getLayout = (panels: PanelVariable[]): ChartLayout => {
    const rows = toRows(panels)
    const last = rows[rows.length - 1]
    const plotBottom = last ? last.top + last.height : HOVER_STRIP

    return {
        rows,
        spans: rows.map(({ top, height }) => ({ top, bottom: top + height })),
        plotTop: rows[0]?.top ?? HOVER_STRIP,
        plotBottom,
        totalHeight: plotBottom + AXIS_HEIGHT,
    }
}

// The caller fetches every series its panels draw; a missing one draws as an empty panel rather than failing.
const getSeries = (series: OverviewMedians, variable: OverviewVariable) => series[variable] ?? NO_SERIES

const isDefined = (p: Point) => p[1] !== null

const getValueAt = (s: MedianSeries, step: string) => {
    const index = s.steps.indexOf(step)

    return index >= 0 ? s.values[index] : null
}

// Gusts outrun the mean wind, so a wind panel showing them takes the gusts' axis steps.
const getPanelDomain = (variable: PanelVariable, s: MedianSeries, secondary: MedianSeries | null) => {
    const hasSecondary = secondary !== null && secondary.values.some((v) => v !== null)
    const scaleVariable = hasSecondary && variable === Variable.Wind ? Variable.Gusts : variable
    const values = hasSecondary ? [...s.values, ...secondary.values] : s.values

    return { domain: getYDomain(values, scaleVariable), scaleVariable }
}

// A readout's second line: the dashed line's value at the slot, or the chance of rain of the precipitation slot.
const getExtraReadout = (
    variable: PanelVariable,
    series: OverviewMedians,
    chance: (number | null)[],
    index: number,
): ExtraReadout | null => {
    const secondary = SECONDARY_VARIABLE[variable]

    if (secondary) {
        const { decimals, unit } = VARIABLE_BY_ID[secondary]
        const s = getSeries(series, secondary)

        return { variable: secondary, value: formatNumber(getValueAt(s, s.steps[index]), decimals), unit }
    }

    if (variable !== Variable.Precip) return null

    const value = chance[index] ?? null

    return { variable: null, value: formatNumber(value === null ? null : value * 100, 0), unit: '%' }
}

// A panel's value axis: the scale and the ticks its gridlines and its pinned labels share.
const getPanelScale = (row: RowLayout, series: OverviewMedians): PanelScale => {
    const secondaryVariable = SECONDARY_VARIABLE[row.variable]
    const secondary = secondaryVariable ? (series[secondaryVariable] ?? null) : null
    const { domain, scaleVariable } = getPanelDomain(row.variable, getSeries(series, row.variable), secondary)

    return { y: getValueScale(domain, [row.bottom, row.top + ROW_PAD]), ticks: getPanelTicks(domain, scaleVariable) }
}

const hasExtraReadout = (variable: PanelVariable) =>
    Boolean(SECONDARY_VARIABLE[variable]) || variable === Variable.Precip

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

const toDots = (key: string, value: number | null | undefined, y: ScaleLinear<number, number>, isSecondary = false) =>
    value === null || value === undefined ? [] : [{ key, cy: y(value), isSecondary }]

// The selected slot's median on every line panel, and the dashed second line's value where a panel has one.
const getHoverDots = (rows: RowLayout[], scales: PanelScale[], series: OverviewMedians, step: string): HoverDot[] =>
    rows.flatMap(({ variable }, i) => {
        const secondaryVariable = SECONDARY_VARIABLE[variable]
        const secondary = secondaryVariable ? series[secondaryVariable] : undefined
        const value = variable === Variable.Precip ? null : getValueAt(getSeries(series, variable), step)

        return [
            ...toDots(variable, value, scales[i].y),
            ...toDots(`${variable}-secondary`, secondary ? getValueAt(secondary, step) : null, scales[i].y, true),
        ]
    })

interface PanelDrawingProps {
    row: RowLayout
    series: OverviewMedians
    scale: PanelScale
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[]
    barWidth: number
    plotRight: number
}

// One panel's gridlines and median (bars for precipitation), with the strip under it.
const PanelDrawing = ({
    row: { variable, bottom },
    series,
    scale: { y, ticks },
    x,
    times,
    directions,
    chance,
    barWidth,
    plotRight,
}: PanelDrawingProps) => {
    const { chart } = useTheme()

    const s = getSeries(series, variable)
    const secondaryVariable = SECONDARY_VARIABLE[variable]
    const secondary = secondaryVariable ? (series[secondaryVariable] ?? null) : null
    const points = toPoints(s)

    return (
        <G>
            {ticks.map((tick) => (
                <Line key={tick} x1={MARGIN.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={chart.grid} />
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
                    <Path d={getAreaPath(points, x, y, bottom)} fill={chart.band} opacity={chart.bandOuterOpacity} />
                    <Path
                        d={getLinePath(points, x, y)}
                        fill="none"
                        stroke={chart.median}
                        strokeWidth={2}
                        strokeLinecap="round"
                    />
                    {secondary && (
                        <Path
                            d={getLinePath(toPoints(secondary), x, y)}
                            fill="none"
                            stroke={chart.median}
                            strokeWidth={1.5}
                            strokeDasharray={SECONDARY_DASH}
                            opacity={0.7}
                        />
                    )}
                </G>
            )}
            {variable === Variable.Precip && (
                <ChanceStrip
                    x={x}
                    times={times}
                    chance={chance}
                    slotMs={SLOT_MS}
                    barWidth={barWidth}
                    plotRight={plotRight}
                    y={bottom + CHANCE_STRIP / 2}
                    fontSize={CHART_FONT_SIZE}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
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
        </G>
    )
}

interface DrawingProps {
    layout: ChartLayout
    series: OverviewMedians
    scales: PanelScale[]
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[]
    barWidth: number
    plotRight: number
    plotWidth: number
    nowX: number | null
    timeZone: string
    locale: string
    clipId: string
}

// Everything that does not follow the selection: ten days of panels, bars, strips and day lines. Its props keep their
// identity while a tap moves the selection, so a tap re-renders only the small layer drawn over it.
const OverviewDrawing = memo(function OverviewDrawing({
    layout,
    series,
    scales,
    x,
    times,
    directions,
    chance,
    barWidth,
    plotRight,
    plotWidth,
    nowX,
    timeZone,
    locale,
    clipId,
}: DrawingProps) {
    const { chart } = useTheme()

    return (
        <>
            <Defs>
                {layout.spans.map(({ top, bottom }, i) => (
                    <ClipPath key={top} id={`${clipId}-${i}`}>
                        <Rect x={MARGIN.left} y={top} width={plotWidth} height={bottom - top} rx={PANEL_RADIUS} />
                    </ClipPath>
                ))}
            </Defs>
            {layout.spans.map(({ top, bottom }) => (
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
                layout.spans.map(({ top, bottom }, i) => (
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
            {layout.rows.map((row, i) => (
                <PanelDrawing
                    key={row.variable}
                    row={row}
                    series={series}
                    scale={scales[i]}
                    x={x}
                    times={times}
                    directions={directions}
                    chance={chance}
                    barWidth={barWidth}
                    plotRight={plotRight}
                />
            ))}
            <DayGrid
                x={x}
                start={times[0]}
                end={times[times.length - 1]}
                timeZone={timeZone}
                locale={locale}
                spans={layout.spans}
                labelY={layout.plotBottom + 16}
                lineColor={chart.border}
                labelColor={chart.muted}
            />
            {nowX !== null &&
                layout.spans.map(({ top, bottom }) => (
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
        </>
    )
})

interface SkeletonLineProps {
    textStyle: StyleProp<TextStyle>
    width: `${number}%`
}

// One line of invisible text gives the line its loaded height; the pulsing bar sits inside it.
const SkeletonLine = ({ textStyle, width }: SkeletonLineProps) => (
    <View>
        <Text style={textStyle}>{NO_BREAK_SPACE}</Text>
        <Skeleton width={width} style={styles.skeletonLine} />
    </View>
)

interface SkeletonProps {
    panels: PanelVariable[]
}

// The loaded overview's shape, line for line: the panels' readouts with their second lines, then the panels at their
// full height.
export function MedianOverviewSkeleton({ panels }: SkeletonProps) {
    const { colors } = useTheme()

    const layout = useMemo(() => getLayout(panels), [panels])

    return (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={styles.readouts}>
                {layout.rows.map(({ variable }) => (
                    <View key={variable} style={[styles.readout, { borderLeftColor: colors.border }]}>
                        <SkeletonLine textStyle={styles.label} width="55%" />
                        <SkeletonLine textStyle={styles.value} width="40%" />
                        {hasExtraReadout(variable) && <SkeletonLine textStyle={styles.extra} width="65%" />}
                    </View>
                ))}
            </View>
            <Skeleton height={layout.totalHeight} />
        </View>
    )
}

interface IProps {
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    series: OverviewMedians
    directions: (number | null)[] | null
    chance: (number | null)[]
    timeZone: string
    locale: string
    now: Date
    accessibilityLabel: string
}

// Median of all models for every panel's variable on one axis of local 3-hour slots; a precipitation bar is the amount
// of the 3 hours after its slot, and the strip under the bars the share of models above 0.2 mm in it. The readouts
// follow the finger, or the slot nearest to now.
export function MedianOverview({
    panels,
    series,
    directions,
    chance,
    timeZone,
    locale,
    now,
    accessibilityLabel,
}: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const tcity = useTranslations('city')
    const { chart, colors } = useTheme()
    const { width, onLayout } = useLayoutWidth()
    const clipId = useId().replace(/[^\w-]/g, '')

    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const [viewLeft, setViewLeft] = useState(0)

    const layout = useMemo(() => getLayout(panels), [panels])
    const axisSteps = getSeries(series, panels[0]).steps
    const times = useMemo(() => axisSteps.map((s) => new Date(s)), [axisSteps])
    const contentWidth = getScrollWidth(width, times.length - 1, MIN_SLOT_WIDTH, MARGIN.left + MARGIN.right)
    const plotRight = contentWidth - MARGIN.right
    const x = useMemo(
        () => getTimeScale(times, [MARGIN.left, Math.max(MARGIN.left + 1, plotRight)]),
        [times, plotRight],
    )
    // One crosshair for every panel: each reads the slot nearest the pointer (or now), so a precipitation readout is
    // the 3 hours from that slot, which can be the bar after the one under the line (author, 2026-10-09).
    const readoutIndex = hoverIndex ?? getNearestIndex(times, now)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = getNowX(x, now, MARGIN.left, plotRight)
    const barWidth = getBarWidth(x, times[0], SLOT_MS)
    const plotWidth = Math.max(0, contentWidth - MARGIN.left - MARGIN.right)
    const slotWidth = times.length > 1 ? x(times[1]) - x(times[0]) : plotWidth
    const scales = useMemo(() => layout.rows.map((row) => getPanelScale(row, series)), [layout, series])
    const hoverDots = hoverIndex === null ? [] : getHoverDots(layout.rows, scales, series, axisSteps[hoverIndex])
    const initialScrollLeft = getInitialScrollLeft(x(now), {
        slotWidth,
        insetLeft: MARGIN.left,
        contentWidth,
        viewportWidth: width,
    })
    const [visibleLeft, visibleRight] = getVisibleRange(viewLeft, width, [MARGIN.left, MARGIN.right])
    const crosshairX = hoverIndex === null ? null : x(times[hoverIndex])
    const hoverX =
        crosshairX === null
            ? null
            : clamp(crosshairX, visibleLeft + HOVER_LABEL_HALF_WIDTH, visibleRight - HOVER_LABEL_HALF_WIDTH)

    const {
        ref: scrollRef,
        onContentSizeChange,
        onScroll,
        getScrollLeft,
    } = useChartScroll(axisSteps[0], initialScrollLeft)

    // The picked time's label clamps to the part of the chart on screen when it was picked.
    const handleSelect = (touchX: number) => {
        setHoverIndex(getNearestIndex(times, x.invert(touchX)))
        setViewLeft(getScrollLeft())
    }

    return (
        <View>
            <View style={styles.readouts}>
                {layout.rows.map(({ variable }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const s = getSeries(series, variable)
                    const isSum = variable === Variable.Precip
                    const extra = getExtraReadout(variable, series, chance, readoutIndex)

                    return (
                        <View key={variable} style={[styles.readout, { borderLeftColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors['muted-foreground'] }]}>{tv(variable)}</Text>
                            <Text isTabular style={[styles.value, { color: colors.foreground }]}>
                                {formatNumber(getValueAt(s, readoutTime), info.decimals)}
                                <Text style={[styles.unit, { color: colors['muted-foreground'] }]}>
                                    {' '}
                                    {isSum ? t('perSlot', { unit: info.unit, hours: SLOT_HOURS }) : info.unit}
                                </Text>
                            </Text>
                            {extra && (
                                <Text isTabular style={[styles.extra, { color: colors['muted-foreground'] }]}>
                                    {t('secondary', {
                                        name: extra.variable ? tv(extra.variable) : tcity('chanceOfRain'),
                                        value: extra.value,
                                        unit: extra.unit,
                                    })}
                                </Text>
                            )}
                        </View>
                    )
                })}
            </View>
            <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
                {width > 0 && (
                    <View>
                        <ScrollView
                            testID="overview-scroll"
                            ref={scrollRef}
                            horizontal
                            onContentSizeChange={onContentSizeChange}
                            onScroll={onScroll}
                            scrollEventThrottle={SCROLL_THROTTLE_MS}
                        >
                            <TapSurface onSelect={handleSelect}>
                                <Svg testID="overview-plot" width={contentWidth} height={layout.totalHeight}>
                                    <OverviewDrawing
                                        layout={layout}
                                        series={series}
                                        scales={scales}
                                        x={x}
                                        times={times}
                                        directions={directions}
                                        chance={chance}
                                        barWidth={barWidth}
                                        plotRight={plotRight}
                                        plotWidth={plotWidth}
                                        nowX={nowX}
                                        timeZone={timeZone}
                                        locale={locale}
                                        clipId={clipId}
                                    />
                                    {nowX !== null && (
                                        <SvgText
                                            x={nowX + 4}
                                            y={layout.plotTop - 6}
                                            fontSize={CHART_FONT_SIZE}
                                            fontFamily={getFontFamily('600')}
                                            fill={chart.foreground}
                                        >
                                            {hoverIndex === null ? tc('now') : ''}
                                        </SvgText>
                                    )}
                                    {hoverIndex !== null && hoverX !== null && crosshairX !== null && (
                                        <G>
                                            <SvgText
                                                x={hoverX}
                                                y={layout.plotTop - 7}
                                                textAnchor="middle"
                                                fontSize={CHART_FONT_SIZE}
                                                fontFamily={getFontFamily('600')}
                                                fill={chart.foreground}
                                            >
                                                {formatStepLabel(axisSteps[hoverIndex], timeZone, locale)}
                                            </SvgText>
                                            {layout.spans.map(({ top, bottom }) => (
                                                <Line
                                                    key={top}
                                                    x1={crosshairX}
                                                    x2={crosshairX}
                                                    y1={top}
                                                    y2={bottom}
                                                    stroke={chart.muted}
                                                />
                                            ))}
                                            {hoverDots.map(({ key, cy, isSecondary }) => (
                                                <Circle
                                                    key={key}
                                                    cx={crosshairX}
                                                    cy={cy}
                                                    r={isSecondary ? 3 : 4}
                                                    fill={isSecondary ? chart.card : chart.median}
                                                    stroke={isSecondary ? chart.median : chart.card}
                                                    strokeWidth={isSecondary ? 1.5 : 2}
                                                />
                                            ))}
                                        </G>
                                    )}
                                </Svg>
                            </TapSurface>
                        </ScrollView>
                        {/* The axis stays while the plot scrolls under it: the tick labels on a card-coloured column and the
                        panel names in the panels' corners. */}
                        <Svg
                            width={width}
                            height={layout.totalHeight}
                            pointerEvents="none"
                            style={StyleSheet.absoluteFill}
                        >
                            <Rect x={0} y={0} width={MARGIN.left} height={layout.totalHeight} fill={chart.card} />
                            {layout.rows.map(({ variable, bottom }, rowIndex) => (
                                <G key={variable}>
                                    {scales[rowIndex].ticks.map((tick) => (
                                        <SvgText
                                            key={tick}
                                            x={MARGIN.left - 6}
                                            y={scales[rowIndex].y(tick) + BASELINE_SHIFT}
                                            textAnchor="end"
                                            fontSize={CHART_FONT_SIZE}
                                            fontFamily={getFontFamily('400')}
                                            fill={chart.muted}
                                        >
                                            {formatYTick(tick)}
                                        </SvgText>
                                    ))}
                                    {variable === Variable.Precip && (
                                        <SvgText
                                            x={MARGIN.left - 6}
                                            y={bottom + CHANCE_STRIP / 2 + BASELINE_SHIFT}
                                            textAnchor="end"
                                            fontSize={CHART_FONT_SIZE}
                                            fontFamily={getFontFamily('400')}
                                            fill={chart.muted}
                                        >
                                            %
                                        </SvgText>
                                    )}
                                </G>
                            ))}
                            {/* Android's SVG has no paint-order, so a card-coloured outline is drawn first as the halo. */}
                            {layout.rows.map(({ variable, top }) =>
                                [chart.card, chart.muted].map((color, i) => (
                                    <SvgText
                                        key={`${variable}-${i}`}
                                        x={MARGIN.left + 6}
                                        y={top + 12}
                                        fontSize={CHART_FONT_SIZE}
                                        fontFamily={getFontFamily('600')}
                                        fill={color}
                                        stroke={i === 0 ? chart.card : undefined}
                                        strokeWidth={i === 0 ? 3 : undefined}
                                        strokeLinejoin="round"
                                    >
                                        {`${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}`}
                                    </SvgText>
                                )),
                            )}
                        </Svg>
                    </View>
                )}
                {width === 0 && <View style={{ height: layout.totalHeight }} />}
            </View>
        </View>
    )
}
