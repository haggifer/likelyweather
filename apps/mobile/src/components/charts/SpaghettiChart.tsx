import { useAnimatedDomain } from '@fa/chart-core/hooks/useAnimatedDomain'
import { CHART_FONT_SIZE, getBarWidth, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYTicks } from '@fa/chart-core/scales'
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
    getStepMs,
    getTickWidth,
    Margin,
    SELECTED_BAR_OPACITY,
    SpaghettiGeometry,
} from '@fa/chart-core/spaghetti-geometry'
import { getSpaghettiHover, getTooltipRows, UNIT_LABEL_WIDTH } from '@fa/chart-core/spaghetti-hover'
import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScaleLinear } from 'd3-scale'
import { memo, useId, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { getFontFamily } from '../../theme/fonts'
import { LineSwatch } from '../ui/LineSwatch'
import { Text } from '../ui/text'
import { DayGrid } from './DayGrid'
import { TapSurface } from './TapSurface'
import { WindArrows } from './WindArrows'

const SCROLL_THROTTLE_MS = 100
const TOOLTIP_SWATCH_WIDTH = 12
// Half the cap height of the tick font, so a label centres on its gridline.
const BASELINE_SHIFT = 3.5
const TOOLTIP_ROW_CLASS = 'flex-row items-center justify-between gap-3'

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
            <Line
                key={s.modelId}
                x1={center - tickWidth / 2}
                x2={center + tickWidth / 2}
                y1={y(v)}
                y2={y(v)}
                stroke={model.color}
                strokeWidth={2}
                strokeDasharray={model.dash}
                strokeLinecap={model.dash ? 'butt' : 'round'}
                opacity={0.9}
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
    clipId: string
    isBars: boolean
    isMedianHidden: boolean
    compact: boolean
}

// Everything that does not follow the selection: ten models over ten days, the bands, the grid and the arrows. Its
// props keep their identity while a tap moves the selection, so a tap re-renders only the small layer drawn over it.
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
    clipId,
    isBars,
    isMedianHidden,
    compact,
}: DrawingProps) {
    const { chart } = useTheme()

    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom

    return (
        <>
            {nowX !== null && (
                <Rect
                    x={margin.left}
                    y={margin.top}
                    width={Math.max(0, nowX - margin.left)}
                    height={plotBottom - margin.top}
                    fill={chart.grid}
                    opacity={0.45}
                />
            )}
            {yTicks.map((tick) => (
                <Line key={tick} x1={margin.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={chart.grid} />
            ))}
            <DayGrid
                x={x}
                start={times[0]}
                end={times[times.length - 1]}
                timeZone={timeZone}
                locale={locale}
                spans={[{ top: margin.top, bottom: plotBottom }]}
                labelY={plotBottom + (compact ? 15 : 18)}
                lineColor={chart.border}
                labelColor={chart.muted}
            />
            <Defs>
                <ClipPath id={clipId}>
                    <Rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
                </ClipPath>
            </Defs>
            <G clipPath={`url(#${clipId})`}>
                {!isBars && <Path d={geometry.rangeBand} fill={chart.band} opacity={chart.bandOpacity} />}
                {bars.map(({ i, center }) => {
                    const median = stats.median[i]

                    return (
                        <G key={times[i].toISOString()}>
                            {median !== null && !isMedianHidden && (
                                <Rect
                                    x={center - barWidth / 2}
                                    y={y(median)}
                                    width={barWidth}
                                    height={Math.max(0, plotBottom - y(median))}
                                    rx={2}
                                    fill={chart.band}
                                    opacity={BAR_OPACITY}
                                />
                            )}
                            <BarTicks series={series} i={i} center={center} tickWidth={tickWidth} y={y} />
                        </G>
                    )
                })}
                {!isBars &&
                    geometry.lines.map(({ modelId, d }) => (
                        <Path
                            key={modelId}
                            d={d}
                            fill="none"
                            stroke={MODEL_BY_ID[modelId].color}
                            strokeWidth={1.5}
                            strokeDasharray={MODEL_BY_ID[modelId].dash}
                            strokeLinecap={MODEL_BY_ID[modelId].dash ? 'butt' : 'round'}
                            opacity={0.9}
                        />
                    ))}
                {!isBars && !isMedianHidden && (
                    <Path d={geometry.median} fill="none" stroke={chart.median} strokeWidth={3} strokeLinecap="round" />
                )}
            </G>
            {nowX !== null && (
                <Line
                    x1={nowX}
                    x2={nowX}
                    y1={margin.top}
                    y2={plotBottom}
                    stroke={chart.foreground}
                    strokeDasharray="4 3"
                />
            )}
            {directions && (
                <WindArrows
                    x={x}
                    times={times}
                    directions={directions}
                    y={getArrowRowY(height)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
            )}
        </>
    )
})

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
    height?: number
    compact?: boolean
    showTooltip?: boolean
    isMedianHidden?: boolean
}

// Every model as a line (precipitation: a tick per model over the median bar), the min–max band,
// the median, local day boundaries and the now line, as on the web. A tap picks a 3-hour slot; a drag scrolls.
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
    height: heightProp = DEFAULT_SPAGHETTI_HEIGHT,
    compact = false,
    showTooltip = false,
    isMedianHidden = false,
}: IProps) {
    const t = useTranslations('chart')
    const { chart } = useTheme()
    const isReducedMotion = useReducedMotion()
    const { width, onLayout } = useLayoutWidth()
    const [viewLeft, setViewLeft] = useState(0)
    const clipId = useId().replace(/[^\w-]/g, '')

    const height = getSpaghettiHeight(width, heightProp)
    const info = VARIABLE_BY_ID[variable]
    const isBars = variable === Variable.Precip
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getSpaghettiMargin(compact, hasArrows), [compact, hasArrows])
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
    const yTicks = useMemo(() => getYTicks(domain, variable, compact ? 3 : 5), [domain, variable, compact])
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
    const hoverBar = hover?.bar
    const hoverMedian = hover ? stats.median[hover.index] : null
    const tooltipRows = hover && showTooltip ? getTooltipRows(series, hover.index) : []
    const plot = { left: margin.left, top: margin.top, right: plotRight, bottom: plotBottom }
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth: x(times[1] ?? times[0]) - x(times[0]),
        insetLeft: margin.left,
        contentWidth,
        viewportWidth: width,
    })

    // The key is the chart's start, not the variable, so switching variables keeps the reader's place.
    const { ref: scrollRef, onContentSizeChange, onScroll, getScrollLeft } = useChartScroll(steps[0], initialScrollLeft)

    const handleSelect = (touchX: number) => {
        onHoverIndex(getPickedIndex(times, x.invert(touchX), stepMs, isBars, indexRange))
        // The picked time's label clamps to the part of the chart on screen when it was picked.
        setViewLeft(getScrollLeft())
    }

    return (
        <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            {width === 0 && <View style={{ height }} />}
            {width > 0 && (
                <View>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        onContentSizeChange={onContentSizeChange}
                        onScroll={onScroll}
                        scrollEventThrottle={SCROLL_THROTTLE_MS}
                    >
                        <View style={{ width: contentWidth }}>
                            <TapSurface onSelect={handleSelect} plot={plot} onClear={() => onHoverIndex(null)}>
                                <Svg width={contentWidth} height={height}>
                                    {/* The picked span's shade goes under the static drawing, as on the web. */}
                                    {hover?.shade && (
                                        <Rect
                                            x={hover.shade.left}
                                            y={margin.top}
                                            width={hover.shade.width}
                                            height={plotBottom - margin.top}
                                            fill={chart.grid}
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
                                        clipId={clipId}
                                        isBars={isBars}
                                        isMedianHidden={isMedianHidden}
                                        compact={compact}
                                    />
                                    {hoverBar && (
                                        <G clipPath={`url(#${clipId})`}>
                                            {hoverMedian !== null && !isMedianHidden && (
                                                <Rect
                                                    x={hoverBar.center - barWidth / 2}
                                                    y={y(hoverMedian)}
                                                    width={barWidth}
                                                    height={Math.max(0, plotBottom - y(hoverMedian))}
                                                    rx={2}
                                                    fill={chart.band}
                                                    opacity={SELECTED_BAR_OPACITY}
                                                />
                                            )}
                                            <BarTicks
                                                series={series}
                                                i={hoverBar.i}
                                                center={hoverBar.center}
                                                tickWidth={tickWidth}
                                                y={y}
                                            />
                                        </G>
                                    )}
                                    {nowX !== null && !hover && (
                                        <SvgText
                                            x={nowX + 4}
                                            y={margin.top + 10}
                                            fontSize={CHART_FONT_SIZE}
                                            fontFamily={getFontFamily('600')}
                                            fill={chart.foreground}
                                        >
                                            {t('now')}
                                        </SvgText>
                                    )}
                                    {hover && (
                                        <G>
                                            {!isBars && (
                                                <Line
                                                    x1={hover.x}
                                                    x2={hover.x}
                                                    y1={margin.top}
                                                    y2={plotBottom}
                                                    stroke={chart.muted}
                                                />
                                            )}
                                            {!compact && (
                                                <SvgText
                                                    x={hover.labelX}
                                                    y={margin.top - 8}
                                                    textAnchor="middle"
                                                    fontSize={CHART_FONT_SIZE}
                                                    fontFamily={getFontFamily('600')}
                                                    fill={chart.foreground}
                                                >
                                                    {hover.label}
                                                </SvgText>
                                            )}
                                            {!isBars &&
                                                series.map((s) => {
                                                    const v = s.values[hover.index]

                                                    if (v === null) return null

                                                    return (
                                                        <Circle
                                                            key={s.modelId}
                                                            cx={hover.x}
                                                            cy={y(v)}
                                                            r={3.5}
                                                            fill={MODEL_BY_ID[s.modelId].color}
                                                            stroke={chart.card}
                                                            strokeWidth={2}
                                                        />
                                                    )
                                                })}
                                            {!isBars && !isMedianHidden && hoverMedian !== null && (
                                                <Circle
                                                    cx={hover.x}
                                                    cy={y(hoverMedian)}
                                                    r={4.5}
                                                    fill={chart.median}
                                                    stroke={chart.card}
                                                    strokeWidth={2}
                                                />
                                            )}
                                        </G>
                                    )}
                                </Svg>
                            </TapSurface>
                            {showTooltip && hover && (
                                <View
                                    pointerEvents="none"
                                    className="absolute top-2 z-10 min-w-40 rounded-md border border-border bg-popover px-2.5 py-2 shadow-md"
                                    style={
                                        hover.x > contentWidth / 2
                                            ? { right: contentWidth - hover.x + 10 }
                                            : { left: hover.x + 10 }
                                    }
                                >
                                    <Text className="mb-1 text-xs text-muted-foreground">{hover.label}</Text>
                                    <View className={cn('mb-1', TOOLTIP_ROW_CLASS)}>
                                        <Text className="text-xs font-semibold">{t('median')}</Text>
                                        <Text className="text-xs font-semibold">
                                            {formatNumber(hoverMedian, info.decimals)}
                                        </Text>
                                    </View>
                                    {/* A dashed swatch and a muted name, as on the web: colour alone would not tell the models apart. */}
                                    {tooltipRows.map((r) => (
                                        <View key={r.modelId} className={TOOLTIP_ROW_CLASS}>
                                            <View className="flex-row items-center gap-1.5">
                                                <LineSwatch
                                                    color={MODEL_BY_ID[r.modelId].color}
                                                    dash={MODEL_BY_ID[r.modelId].dash}
                                                    width={TOOLTIP_SWATCH_WIDTH}
                                                />
                                                <Text className="text-xs text-muted-foreground">
                                                    {MODEL_BY_ID[r.modelId].name}
                                                </Text>
                                            </View>
                                            <Text className="text-xs font-medium">
                                                {formatNumber(r.value, info.decimals)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                    {/* The axis stays while the plot scrolls under it, on a card-coloured column. */}
                    <Svg width={width} height={height} pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <Rect x={0} y={0} width={margin.left} height={height} fill={chart.card} />
                        {yTicks.map((tick) => (
                            <SvgText
                                key={tick}
                                x={margin.left - 6}
                                y={y(tick) + BASELINE_SHIFT}
                                textAnchor="end"
                                fontSize={CHART_FONT_SIZE}
                                fontFamily={getFontFamily('400')}
                                fill={chart.muted}
                            >
                                {formatYTick(tick, info.decimals === 0)}
                            </SvgText>
                        ))}
                        {!compact && (
                            <G>
                                <Rect
                                    x={margin.left}
                                    y={0}
                                    width={UNIT_LABEL_WIDTH}
                                    height={margin.top - 2}
                                    fill={chart.card}
                                />
                                <SvgText
                                    x={margin.left}
                                    y={margin.top - 8}
                                    fontSize={CHART_FONT_SIZE}
                                    fontFamily={getFontFamily('400')}
                                    fill={chart.muted}
                                >
                                    {info.unit}
                                </SvgText>
                            </G>
                        )}
                    </Svg>
                </View>
            )}
        </View>
    )
}
