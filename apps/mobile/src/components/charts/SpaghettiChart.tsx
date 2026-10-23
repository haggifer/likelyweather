import { ChartTheme } from '@fa/chart-core/chart-theme'
import { useAnimatedDomain } from '@fa/chart-core/hooks/useAnimatedDomain'
import { getBarWidth, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getScrollWidth, getVisibleRange, MIN_SLOT_WIDTH } from '@fa/chart-core/scroll-geometry'
import {
    BAR_OPACITY,
    buildSpaghettiGeometry,
    ClipRect,
    DEFAULT_SPAGHETTI_HEIGHT,
    DrawnBar,
    getArrowRowY,
    getClipRect,
    getDrawnBars,
    getIndexRange,
    getPickedIndex,
    getSeriesYDomain,
    getSpaghettiHeight,
    getSpaghettiMargin,
    getSpaghettiTicks,
    getStepMs,
    getTickWidth,
    Margin,
    SELECTED_BAR_OPACITY,
    SpaghettiGeometry,
} from '@fa/chart-core/spaghetti-geometry'
import { getSpaghettiHover, SpaghettiHover, UNIT_LABEL_WIDTH } from '@fa/chart-core/spaghetti-hover'
import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { MODEL_BY_ID } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import {
    Canvas,
    Circle,
    DashPathEffect,
    Group,
    Line,
    Path,
    Rect,
    rect,
    RoundedRect,
    SkFont,
    vec,
} from '@shopify/react-native-skia'
import { ScaleLinear } from 'd3-scale'
import { memo, useMemo, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Animated, { useAnimatedScrollHandler, useDerivedValue, useSharedValue } from 'react-native-reanimated'
import { useTranslations } from 'use-intl'
import { useChartFonts } from '../../hooks/useChartFonts'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import { CanvasDayGrid } from './CanvasDayGrid'
import { CanvasText } from './CanvasText'
import { CanvasWindArrows } from './CanvasWindArrows'
import { TapSurface } from './TapSurface'

// The canvas follows the offset every frame, so the scroll view reports every frame.
const SCROLL_THROTTLE_MS = 16
// Half the cap height of the tick font, so a label centres on its gridline.
const BASELINE_SHIFT = 3.5
const Y_TICK_COUNT = 5
const DAY_LABEL_OFFSET = 18
const NOW_INTERVALS = [4, 3]

// The scroll view only scrolls and takes taps; its content is an empty view as wide as the plot, which the canvas
// behind it draws.
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

// A model's SVG `stroke-dasharray` ("4 3") as Skia's dash intervals; a solid line has none.
const getDashIntervals = (dash: string | undefined) => (dash ? dash.split(' ').map(Number) : null)

interface ModelStrokeProps {
    path: string
    color: string
    dash: string | undefined
    strokeWidth: number
}

const ModelStroke = ({ path, color, dash, strokeWidth }: ModelStrokeProps) => {
    const intervals = getDashIntervals(dash)

    return (
        <Path
            path={path}
            color={color}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap={intervals ? 'butt' : 'round'}
            opacity={0.9}
        >
            {intervals && <DashPathEffect intervals={intervals} />}
        </Path>
    )
}

interface BarTicksProps {
    series: Series[]
    i: number
    center: number
    tickWidth: number
    y: ScaleLinear<number, number>
}

// Each model's amount as a tick across its bar.
const BarTicks = ({ series, i, center, tickWidth, y }: BarTicksProps) =>
    series.map((s) => {
        const v = s.values[i]
        const model = MODEL_BY_ID[s.modelId]

        if (v === null) return null

        return (
            <ModelStroke
                key={s.modelId}
                path={`M${center - tickWidth / 2},${y(v)}H${center + tickWidth / 2}`}
                color={model.color}
                dash={model.dash}
                strokeWidth={2}
            />
        )
    })

interface DrawingProps {
    geometry: SpaghettiGeometry
    series: Series[]
    stats: EnsembleStats
    bars: DrawnBar[]
    barWidth: number
    tickWidth: number
    yTicks: number[]
    margin: Margin
    height: number
    plotRight: number
    clip: ClipRect
    nowX: number | null
    directions?: (number | null)[] | null
    timeZone: string
    locale: string
    isBars: boolean
    isMedianHidden: boolean
    chart: ChartTheme
    font: SkFont | null
}

// Everything that does not follow the selection: ten models over ten days, the bands, the grid and the arrows. Its
// props keep their identity while a tap moves the selection, so a tap re-records only the small layer drawn over it.
const SpaghettiDrawing = memo(function SpaghettiDrawing({
    geometry,
    series,
    stats,
    bars,
    barWidth,
    tickWidth,
    yTicks,
    margin,
    height,
    plotRight,
    clip,
    nowX,
    directions,
    timeZone,
    locale,
    isBars,
    isMedianHidden,
    chart,
    font,
}: DrawingProps) {
    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom

    return (
        <Group>
            {nowX !== null && (
                <Rect
                    x={margin.left}
                    y={margin.top}
                    width={Math.max(0, nowX - margin.left)}
                    height={plotBottom - margin.top}
                    color={chart.grid}
                    opacity={0.45}
                />
            )}
            {yTicks.map((tick) => (
                <Line
                    key={tick}
                    p1={vec(margin.left, y(tick))}
                    p2={vec(plotRight, y(tick))}
                    color={chart.grid}
                    style="stroke"
                    strokeWidth={1}
                />
            ))}
            <CanvasDayGrid
                x={x}
                start={times[0]}
                end={times[times.length - 1]}
                timeZone={timeZone}
                locale={locale}
                spans={[{ top: margin.top, bottom: plotBottom }]}
                labelY={plotBottom + DAY_LABEL_OFFSET}
                lineColor={chart.border}
                labelColor={chart.muted}
                font={font}
            />
            <Group clip={rect(clip.x, clip.y, clip.width, clip.height)}>
                {!isBars && <Path path={geometry.rangeBand} color={chart.band} opacity={chart.bandOpacity} />}
                {bars.map(({ i, center }) => {
                    const median = stats.median[i]

                    return (
                        <Group key={times[i].toISOString()}>
                            {median !== null && !isMedianHidden && (
                                <RoundedRect
                                    x={center - barWidth / 2}
                                    y={y(median)}
                                    width={barWidth}
                                    height={Math.max(0, plotBottom - y(median))}
                                    r={2}
                                    color={chart.band}
                                    opacity={BAR_OPACITY}
                                />
                            )}
                            <BarTicks series={series} i={i} center={center} tickWidth={tickWidth} y={y} />
                        </Group>
                    )
                })}
                {!isBars &&
                    geometry.lines.map(({ modelId, d }) => (
                        <ModelStroke
                            key={modelId}
                            path={d}
                            color={MODEL_BY_ID[modelId].color}
                            dash={MODEL_BY_ID[modelId].dash}
                            strokeWidth={1.5}
                        />
                    ))}
                {!isBars && !isMedianHidden && (
                    <Path
                        path={geometry.median}
                        color={chart.median}
                        style="stroke"
                        strokeWidth={3}
                        strokeCap="round"
                    />
                )}
            </Group>
            {nowX !== null && (
                <Line
                    p1={vec(nowX, margin.top)}
                    p2={vec(nowX, plotBottom)}
                    color={chart.foreground}
                    style="stroke"
                    strokeWidth={1}
                >
                    <DashPathEffect intervals={NOW_INTERVALS} />
                </Line>
            )}
            {directions && (
                <CanvasWindArrows
                    x={x}
                    times={times}
                    directions={directions}
                    y={getArrowRowY(height)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
            )}
        </Group>
    )
})

interface DotProps {
    cx: number
    cy: number
    r: number
    color: string
    ringColor: string
}

// A dot with a card-coloured ring, SVG's fill and centred stroke in two draws.
const Dot = ({ cx, cy, r, color, ringColor }: DotProps) => (
    <Group>
        <Circle cx={cx} cy={cy} r={r} color={color} />
        <Circle cx={cx} cy={cy} r={r} color={ringColor} style="stroke" strokeWidth={2} />
    </Group>
)

interface SelectionDrawingProps {
    hover: SpaghettiHover
    series: Series[]
    stats: EnsembleStats
    y: ScaleLinear<number, number>
    margin: Margin
    plotBottom: number
    barWidth: number
    tickWidth: number
    clip: ClipRect
    isBars: boolean
    isMedianHidden: boolean
    chart: ChartTheme
    font: SkFont | null
}

// The picked slot over the static drawing: its bar raised (precipitation) or a line with every model's dot, and its
// time above the plot.
const SelectionDrawing = ({
    hover,
    series,
    stats,
    y,
    margin,
    plotBottom,
    barWidth,
    tickWidth,
    clip,
    isBars,
    isMedianHidden,
    chart,
    font,
}: SelectionDrawingProps) => {
    const median = stats.median[hover.index]

    return (
        <Group>
            {hover.bar && (
                <Group clip={rect(clip.x, clip.y, clip.width, clip.height)}>
                    {median !== null && !isMedianHidden && (
                        <RoundedRect
                            x={hover.bar.center - barWidth / 2}
                            y={y(median)}
                            width={barWidth}
                            height={Math.max(0, plotBottom - y(median))}
                            r={2}
                            color={chart.band}
                            opacity={SELECTED_BAR_OPACITY}
                        />
                    )}
                    <BarTicks series={series} i={hover.bar.i} center={hover.bar.center} tickWidth={tickWidth} y={y} />
                </Group>
            )}
            {!isBars && (
                <Line
                    p1={vec(hover.x, margin.top)}
                    p2={vec(hover.x, plotBottom)}
                    color={chart.muted}
                    style="stroke"
                    strokeWidth={1}
                />
            )}
            <CanvasText
                font={font}
                text={hover.label}
                x={hover.labelX}
                y={margin.top - 8}
                color={chart.foreground}
                anchor="middle"
            />
            {!isBars &&
                series.map((s) => {
                    const v = s.values[hover.index]

                    if (v === null) return null

                    return (
                        <Dot
                            key={s.modelId}
                            cx={hover.x}
                            cy={y(v)}
                            r={3.5}
                            color={MODEL_BY_ID[s.modelId].color}
                            ringColor={chart.card}
                        />
                    )
                })}
            {!isBars && !isMedianHidden && median !== null && (
                <Dot cx={hover.x} cy={y(median)} r={4.5} color={chart.median} ringColor={chart.card} />
            )}
        </Group>
    )
}

interface AxisDrawingProps {
    y: ScaleLinear<number, number>
    yTicks: number[]
    margin: Margin
    height: number
    unit: string
    isWholeNumbers: boolean
    chart: ChartTheme
    font: SkFont | null
}

// The axis stays while the plot scrolls under it: the tick labels on a card-coloured column and the unit above the
// plot's corner.
const AxisDrawing = ({ y, yTicks, margin, height, unit, isWholeNumbers, chart, font }: AxisDrawingProps) => (
    <Group>
        <Rect x={0} y={0} width={margin.left} height={height} color={chart.card} />
        {yTicks.map((tick) => (
            <CanvasText
                key={tick}
                font={font}
                text={formatYTick(tick, isWholeNumbers)}
                x={margin.left - 6}
                y={y(tick) + BASELINE_SHIFT}
                color={chart.muted}
                anchor="end"
            />
        ))}
        <Rect x={margin.left} y={0} width={UNIT_LABEL_WIDTH} height={margin.top - 2} color={chart.card} />
        <CanvasText font={font} text={unit} x={margin.left} y={margin.top - 8} color={chart.muted} />
    </Group>
)

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    variable: Variable
    timeZone: string
    locale: string
    accessibilityLabel: string
    hoverIndex: number | null
    onHoverIndex: (index: number | null) => void
    now: Date | null
    directions?: (number | null)[] | null
    isMedianHidden?: boolean
}

// Every model as a line (precipitation: a tick per model over the median bar), the min–max band, the median, local
// day boundaries and the now line, as on the web, on one screen-wide GPU canvas. On Android react-native-svg
// rasterises a whole <Svg> on the CPU after any change; here the plot is recorded once and replayed shifted by the
// scroll offset on the UI thread, so a scroll renders nothing in React and a change redraws no bitmap. A tap picks a
// 3-hour slot; a drag scrolls.
export function SpaghettiChart({
    steps,
    series,
    stats,
    variable,
    timeZone,
    locale,
    accessibilityLabel,
    hoverIndex,
    onHoverIndex,
    now,
    directions,
    isMedianHidden = false,
}: IProps) {
    const t = useTranslations('chart')
    const { chart } = useTheme()
    const { regular, semiBold } = useChartFonts()
    const isReducedMotion = useReducedMotion()
    const { width, onLayout } = useLayoutWidth()

    const [viewLeft, setViewLeft] = useState(0)
    const scrollX = useSharedValue(0)

    const height = getSpaghettiHeight(width, DEFAULT_SPAGHETTI_HEIGHT)
    const info = VARIABLE_BY_ID[variable]
    const isBars = variable === Variable.Precip
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getSpaghettiMargin(false, hasArrows), [hasArrows])
    const contentWidth = getScrollWidth(width, steps.length - 1, MIN_SLOT_WIDTH, margin.left + margin.right)
    const target = useMemo(() => getSeriesYDomain(series, variable), [series, variable])
    // A refresh of the same variable eases the axis to its new range; another variable jumps.
    const domain = useAnimatedDomain(target, variable, isReducedMotion)
    const geometry = useMemo(
        () =>
            buildSpaghettiGeometry({ steps, series, stats, width: Math.max(contentWidth, 1), height, domain, margin }),
        [steps, series, stats, contentWidth, height, domain, margin],
    )

    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const plotRight = contentWidth - margin.right
    const nowX = getNowX(x, now, margin.left, plotRight)
    const yTicks = useMemo(() => getSpaghettiTicks(series, domain, variable, Y_TICK_COUNT), [series, domain, variable])
    const stepMs = getStepMs(times)
    const barWidth = getBarWidth(x, times[0], stepMs)
    const tickWidth = getTickWidth(barWidth)
    const bars = useMemo(
        () => (isBars ? getDrawnBars(times, x, stepMs, barWidth, [margin.left, plotRight]) : []),
        [isBars, times, x, stepMs, barWidth, margin.left, plotRight],
    )
    const clip = useMemo(() => getClipRect(margin, plotRight, plotBottom), [margin, plotRight, plotBottom])
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
    const plot = { left: margin.left, top: margin.top, right: plotRight, bottom: plotBottom }
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth: x(times[1] ?? times[0]) - x(times[0]),
        insetLeft: margin.left,
        contentWidth,
        viewportWidth: width,
    })
    const plotTransform = useDerivedValue(() => [{ translateX: -scrollX.get() }])

    // The key is the chart's start, not the variable, so switching variables keeps the reader's place.
    const { ref: scrollRef, onContentSizeChange } = useChartScroll(steps[0], initialScrollLeft)
    const handleScroll = useAnimatedScrollHandler((e) => scrollX.set(e.contentOffset.x))

    // The picked time's label clamps to the part of the chart on screen when it was picked.
    const handleSelect = (touchX: number) => {
        onHoverIndex(getPickedIndex(times, x.invert(touchX), stepMs, isBars, indexRange))
        setViewLeft(scrollX.get())
    }

    return (
        <View
            onLayout={onLayout}
            style={{ height }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
        >
            {width > 0 && (
                <>
                    <Canvas
                        testID="spaghetti-canvas"
                        pointerEvents="none"
                        style={{ position: 'absolute', top: 0, left: 0, width, height }}
                    >
                        <Group transform={plotTransform}>
                            {/* The picked span's shade goes under the static drawing, as on the web. */}
                            {hover?.shade && (
                                <Rect
                                    x={hover.shade.left}
                                    y={margin.top}
                                    width={hover.shade.width}
                                    height={plotBottom - margin.top}
                                    color={chart.grid}
                                    opacity={0.8}
                                />
                            )}
                            <SpaghettiDrawing
                                geometry={geometry}
                                series={series}
                                stats={stats}
                                bars={bars}
                                barWidth={barWidth}
                                tickWidth={tickWidth}
                                yTicks={yTicks}
                                margin={margin}
                                height={height}
                                plotRight={plotRight}
                                clip={clip}
                                nowX={nowX}
                                directions={directions}
                                timeZone={timeZone}
                                locale={locale}
                                isBars={isBars}
                                isMedianHidden={isMedianHidden}
                                chart={chart}
                                font={regular}
                            />
                            {nowX !== null && !hover && (
                                <CanvasText
                                    font={semiBold}
                                    text={t('now')}
                                    x={nowX + 4}
                                    y={margin.top + 10}
                                    color={chart.foreground}
                                />
                            )}
                            {hover && (
                                <SelectionDrawing
                                    hover={hover}
                                    series={series}
                                    stats={stats}
                                    y={y}
                                    margin={margin}
                                    plotBottom={plotBottom}
                                    barWidth={barWidth}
                                    tickWidth={tickWidth}
                                    clip={clip}
                                    isBars={isBars}
                                    isMedianHidden={isMedianHidden}
                                    chart={chart}
                                    font={semiBold}
                                />
                            )}
                        </Group>
                        <AxisDrawing
                            y={y}
                            yTicks={yTicks}
                            margin={margin}
                            height={height}
                            unit={info.unit}
                            isWholeNumbers={info.decimals === 0}
                            chart={chart}
                            font={regular}
                        />
                    </Canvas>
                    <AnimatedScrollView
                        testID="spaghetti-scroll"
                        ref={scrollRef}
                        horizontal
                        onContentSizeChange={onContentSizeChange}
                        onScroll={handleScroll}
                        scrollEventThrottle={SCROLL_THROTTLE_MS}
                    >
                        <TapSurface onSelect={handleSelect} plot={plot} onClear={() => onHoverIndex(null)}>
                            <View testID="spaghetti-plot" style={{ width: contentWidth, height }} />
                        </TapSurface>
                    </AnimatedScrollView>
                </>
            )}
        </View>
    )
}
