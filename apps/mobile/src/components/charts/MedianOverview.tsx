import {
    getArrowY,
    getChanceLabels,
    getChanceY,
    getHoverDots,
    getOverviewContentWidth,
    getOverviewFrame,
    getOverviewLayout,
    getPanelBars,
    getPanelPaths,
    getPanelScale,
    OVERVIEW_MARGIN_RIGHT,
    OVERVIEW_SIZE,
    OverviewFrame,
    OverviewLayout,
    PANEL_RADIUS,
    PanelRow,
    PanelScale,
    SECONDARY_DASH,
} from '@fa/chart-core/overview-geometry'
import {
    getExtraReadout,
    getOverviewReadoutIndex,
    getPanelSeries,
    getValueAt,
    hasExtraReadout,
} from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { CHART_FONT_SIZE, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getLabelX, getVisibleRange } from '@fa/chart-core/scroll-geometry'
import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { memo, useId, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { getFontFamily } from '../../theme/fonts'
import { Skeleton } from '../ui/skeleton'
import { Text } from '../ui/text'
import { ChanceStrip } from './ChanceStrip'
import { DayGrid } from './DayGrid'
import { TapSurface } from './TapSurface'
import { WindArrows } from './WindArrows'

// The web's phone layout: readouts in a two-column grid above, the reader's panels stacked below in the same order,
// each named inside its panel.
const { heights: PANEL_HEIGHTS, marginLeft: MARGIN_LEFT, hoverLabelHalfWidth: HOVER_LABEL_HALF_WIDTH } = OVERVIEW_SIZE
const SCROLL_THROTTLE_MS = 100
// Half the cap height of the tick font, so a label centres on its gridline.
const BASELINE_SHIFT = 3.5
const NO_BREAK_SPACE = ' '
// The web's phone grid: two equal columns with the gap between them; an odd last readout keeps to its column.
const READOUTS_CLASS = 'flex-row flex-wrap gap-2'
const READOUT_CLASS = 'max-w-[50%] grow basis-2/5 border-l-2 border-border pr-1 pl-3'
const LABEL_CLASS = 'text-xs font-medium text-muted-foreground'
const VALUE_CLASS = 'text-xl leading-tight font-semibold tabular-nums'
const EXTRA_CLASS = 'text-xs text-muted-foreground tabular-nums'

interface PanelDrawingProps {
    row: PanelRow
    series: OverviewMedians
    scale: PanelScale
    frame: OverviewFrame
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[] | null
}

// One panel's gridlines and median (bars for precipitation), with the strip under it.
const PanelDrawing = ({ row, series, scale: { y, ticks }, frame, times, directions, chance }: PanelDrawingProps) => {
    const { chart } = useTheme()

    const { x, plotRight } = frame
    const { variable, bottom } = row
    const paths = variable === Variable.Precip ? null : getPanelPaths(row, series, x, y)

    return (
        <G>
            {ticks.map((tick) => (
                <Line key={tick} x1={MARGIN_LEFT} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={chart.grid} />
            ))}
            {paths ? (
                <G>
                    <Path d={paths.area} fill={chart.band} opacity={chart.bandOpacity} />
                    <Path d={paths.line} fill="none" stroke={chart.median} strokeWidth={2} strokeLinecap="round" />
                    {paths.secondary !== null && (
                        <Path
                            d={paths.secondary}
                            fill="none"
                            stroke={chart.median}
                            strokeWidth={1.5}
                            strokeDasharray={SECONDARY_DASH}
                            opacity={0.7}
                        />
                    )}
                </G>
            ) : (
                getPanelBars(row, series, x, y, frame).map((bar) => (
                    <Rect
                        key={bar.key}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        rx={2}
                        fill={chart.band}
                        opacity={0.75}
                    />
                ))
            )}
            {variable === Variable.Precip && chance && (
                <ChanceStrip
                    labels={getChanceLabels(chance, times, x, frame)}
                    y={getChanceY(bottom)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
            )}
            {variable === Variable.Wind && directions && (
                <WindArrows
                    x={x}
                    times={times}
                    directions={directions}
                    y={getArrowY(bottom)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
            )}
        </G>
    )
}

interface DrawingProps {
    layout: OverviewLayout
    series: OverviewMedians
    scales: PanelScale[]
    frame: OverviewFrame
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[] | null
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
    frame,
    times,
    directions,
    chance,
    nowX,
    timeZone,
    locale,
    clipId,
}: DrawingProps) {
    const { chart } = useTheme()

    const { x, plotWidth } = frame

    return (
        <>
            <Defs>
                {layout.spans.map(({ top, bottom }, i) => (
                    <ClipPath key={top} id={`${clipId}-${i}`}>
                        <Rect x={MARGIN_LEFT} y={top} width={plotWidth} height={bottom - top} rx={PANEL_RADIUS} />
                    </ClipPath>
                ))}
            </Defs>
            {layout.spans.map(({ top, bottom }) => (
                <Rect
                    key={top}
                    x={MARGIN_LEFT}
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
                        x={MARGIN_LEFT}
                        y={top}
                        width={Math.max(0, nowX - MARGIN_LEFT)}
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
                    frame={frame}
                    times={times}
                    directions={directions}
                    chance={chance}
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
    className: string
    widthClass: string
}

// One line of invisible text gives the line its loaded height; the pulsing bar sits inside it.
const SkeletonLine = ({ className, widthClass }: SkeletonLineProps) => (
    <View>
        <Text className={className}>{NO_BREAK_SPACE}</Text>
        <Skeleton className={cn('absolute top-0.5 bottom-0.5', widthClass)} />
    </View>
)

interface SkeletonProps {
    panels: PanelVariable[]
    // The archive's precipitation readout has no chance-of-rain line.
    isArchive?: boolean
}

// The loaded overview's shape, line for line: the panels' readouts with their second lines, then the panels at their
// full height.
export function MedianOverviewSkeleton({ panels, isArchive = false }: SkeletonProps) {
    const layout = useMemo(() => getOverviewLayout(PANEL_HEIGHTS, panels, !isArchive), [panels, isArchive])

    return (
        <View className="gap-3" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View className={READOUTS_CLASS}>
                {layout.rows.map(({ variable }) => (
                    <View key={variable} className={READOUT_CLASS}>
                        <SkeletonLine className={LABEL_CLASS} widthClass="w-[55%]" />
                        <SkeletonLine className={VALUE_CLASS} widthClass="w-[40%]" />
                        {hasExtraReadout(variable, !isArchive) && (
                            <SkeletonLine className={EXTRA_CLASS} widthClass="w-[65%]" />
                        )}
                    </View>
                ))}
            </View>
            <Skeleton style={{ height: layout.totalHeight }} />
        </View>
    )
}

interface IProps {
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    series: OverviewMedians
    directions: (number | null)[] | null
    // The share of models above 0.2 mm per slot; the archive has one series and passes none.
    chance: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date | null
    accessibilityLabel: string
    // Past weather, hour by hour: precipitation reads as the hour from the step.
    isArchive?: boolean
}

// Median of all models for every panel's variable on one axis of local 3-hour slots; a precipitation bar is the amount
// of the 3 hours after its slot, and the strip under the bars the share of models above 0.2 mm in it. The readouts
// follow the finger, or the slot nearest to now. The archive draws a city's past weather the same way, every hour and
// narrower, without a now line or a chance of rain, opening at its first hour.
export function MedianOverview({
    panels,
    series,
    directions,
    chance,
    timeZone,
    locale,
    now,
    accessibilityLabel,
    isArchive = false,
}: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const tcity = useTranslations('city')
    const { chart } = useTheme()
    const { width, onLayout } = useLayoutWidth()
    const clipId = useId().replace(/[^\w-]/g, '')

    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const [viewLeft, setViewLeft] = useState(0)

    const hasChance = chance !== null
    const layout = useMemo(() => getOverviewLayout(PANEL_HEIGHTS, panels, hasChance), [panels, hasChance])
    const axisSteps = getPanelSeries(series, panels[0]).steps
    const times = useMemo(() => axisSteps.map((s) => new Date(s)), [axisSteps])
    const contentWidth = getOverviewContentWidth(width, times.length, MARGIN_LEFT, isArchive)
    const frame = useMemo(
        () => getOverviewFrame(times, MARGIN_LEFT, contentWidth, isArchive),
        [times, contentWidth, isArchive],
    )
    const { x, plotRight, slotWidth } = frame
    const readoutIndex = getOverviewReadoutIndex(times, hoverIndex, now)
    const readoutTime = axisSteps[readoutIndex]
    const nowX = getNowX(x, now, MARGIN_LEFT, plotRight)
    const scales = useMemo(() => layout.rows.map((row) => getPanelScale(row, series)), [layout, series])
    const hoverDots = hoverIndex === null ? [] : getHoverDots(layout.rows, scales, series, axisSteps[hoverIndex])
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth,
        insetLeft: MARGIN_LEFT,
        contentWidth,
        viewportWidth: width,
    })
    const visibleRange = getVisibleRange(viewLeft, width, [MARGIN_LEFT, OVERVIEW_MARGIN_RIGHT])
    const crosshairX = hoverIndex === null ? null : x(times[hoverIndex])
    const hoverX = crosshairX === null ? null : getLabelX(crosshairX, visibleRange, HOVER_LABEL_HALF_WIDTH)

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
        <View className="gap-3">
            <View className={READOUTS_CLASS}>
                {layout.rows.map(({ variable }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const value = getValueAt(getPanelSeries(series, variable), readoutTime)
                    const extra = getExtraReadout(variable, series, chance, readoutTime, readoutIndex)

                    return (
                        <View key={variable} className={READOUT_CLASS}>
                            <Text className={LABEL_CLASS}>{tv(variable)}</Text>
                            <Text className={VALUE_CLASS}>
                                {formatNumber(value, info.decimals)}
                                <Text className="text-sm font-normal text-muted-foreground">
                                    {' '}
                                    {variable === Variable.Precip
                                        ? isArchive
                                            ? t('perHourPast', { unit: info.unit })
                                            : t('perSlot', { unit: info.unit, hours: SLOT_HOURS })
                                        : info.unit}
                                </Text>
                            </Text>
                            {extra && (
                                <Text className={EXTRA_CLASS}>
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
                                        frame={frame}
                                        times={times}
                                        directions={directions}
                                        chance={chance}
                                        nowX={nowX}
                                        timeZone={timeZone}
                                        locale={locale}
                                        clipId={clipId}
                                    />
                                    {nowX !== null && (
                                        <SvgText
                                            x={nowX}
                                            y={layout.plotTop - 7}
                                            textAnchor="middle"
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
                            <Rect x={0} y={0} width={MARGIN_LEFT} height={layout.totalHeight} fill={chart.card} />
                            {layout.rows.map(({ variable, bottom }, rowIndex) => (
                                <G key={variable}>
                                    {scales[rowIndex].ticks.map((tick) => (
                                        <SvgText
                                            key={tick}
                                            x={MARGIN_LEFT - 6}
                                            y={scales[rowIndex].y(tick) + BASELINE_SHIFT}
                                            textAnchor="end"
                                            fontSize={CHART_FONT_SIZE}
                                            fontFamily={getFontFamily('400')}
                                            fill={chart.muted}
                                        >
                                            {formatYTick(tick)}
                                        </SvgText>
                                    ))}
                                    {variable === Variable.Precip && chance && (
                                        <SvgText
                                            x={MARGIN_LEFT - 6}
                                            y={getChanceY(bottom) + BASELINE_SHIFT}
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
                                        x={MARGIN_LEFT + 6}
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
