import { ChartTheme } from '@fa/chart-core/chart-theme'
import {
    getArrowY,
    getChanceLabels,
    getChanceY,
    getPanelBars,
    getPanelPaths,
    OverviewFrame,
    OverviewLayout,
    PANEL_RADIUS,
    PanelRow,
    PanelScale,
    SECONDARY_DASH,
} from '@fa/chart-core/overview-geometry'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { AXIS_FONT_SIZE, getNowLabelStart, PANEL_NAME_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { formatYTick } from '@fa/chart-core/scales'
import { Variable } from '@fa/shared/variables'
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
    rrect,
    SkFont,
    Text,
    vec,
} from '@shopify/react-native-skia'
import { memo } from 'react'
import { SharedValue, useDerivedValue } from 'react-native-reanimated'
import { useChartFonts } from '../../hooks/useChartFonts'
import { CanvasChanceStrip } from './CanvasChanceStrip'
import { CanvasDayGrid } from './CanvasDayGrid'
import { CanvasText, getAdvanceWidth } from './CanvasText'
import { CanvasWindArrows } from './CanvasWindArrows'
import { OverviewSelection } from './types'

// Half the cap height of the tick font, so a label centres on its gridline: SVG's `dy="0.32em"`.
const BASELINE_SHIFT = AXIS_FONT_SIZE * 0.32
const SECONDARY_INTERVALS = SECONDARY_DASH.split(' ').map(Number)
const NOW_INTERVALS = [4, 3]
const NAME_HALO_WIDTH = 3

interface PanelDrawingProps {
    row: PanelRow
    series: OverviewMedians
    scale: PanelScale
    frame: OverviewFrame
    marginLeft: number
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[] | null
    chart: ChartTheme
    font: SkFont | null
    likelyFont: SkFont | null
}

const PanelDrawing = ({
    row,
    series,
    scale: { y, ticks },
    frame,
    marginLeft,
    times,
    directions,
    chance,
    chart,
    font,
    likelyFont,
}: PanelDrawingProps) => {
    const { x, plotRight } = frame
    const { variable, bottom } = row
    const paths = variable === Variable.Precip ? null : getPanelPaths(row, series, x, y)

    return (
        <Group>
            {ticks.map((tick) => (
                <Line
                    key={tick}
                    p1={vec(marginLeft, y(tick))}
                    p2={vec(plotRight, y(tick))}
                    color={chart.grid}
                    style="stroke"
                    strokeWidth={1}
                />
            ))}
            {paths ? (
                <Group>
                    <Path path={paths.area} color={chart.band} opacity={chart.bandOpacity} />
                    <Path path={paths.line} color={chart.median} style="stroke" strokeWidth={2} strokeCap="round" />
                    {paths.secondary !== null && (
                        <Path
                            path={paths.secondary}
                            color={chart.median}
                            style="stroke"
                            strokeWidth={1.5}
                            opacity={0.7}
                        >
                            <DashPathEffect intervals={SECONDARY_INTERVALS} />
                        </Path>
                    )}
                </Group>
            ) : (
                getPanelBars(row, series, x, y, frame).map((bar) => (
                    <RoundedRect
                        key={bar.key}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        r={2}
                        color={chart.band}
                        opacity={0.75}
                    />
                ))
            )}
            {variable === Variable.Precip && chance && (
                <CanvasChanceStrip
                    labels={getChanceLabels(chance, times, x, frame)}
                    y={getChanceY(bottom)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                    font={font}
                    likelyFont={likelyFont}
                />
            )}
            {variable === Variable.Wind && directions && (
                <CanvasWindArrows
                    x={x}
                    times={times}
                    directions={directions}
                    y={getArrowY(bottom)}
                    color={chart.foreground}
                    mutedColor={chart.muted}
                />
            )}
        </Group>
    )
}

interface PlotDrawingProps {
    layout: OverviewLayout
    series: OverviewMedians
    scales: PanelScale[]
    frame: OverviewFrame
    marginLeft: number
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[] | null
    nowX: number | null
    timeZone: string
    locale: string
    chart: ChartTheme
    font: SkFont | null
    likelyFont: SkFont | null
}

// Everything that does not follow the selection: ten days of panels, bars, strips and day lines. Its props keep their
// identity while a tap moves the selection, so a tap re-records only the small layer drawn over it.
const PlotDrawing = memo(function PlotDrawing({
    layout,
    series,
    scales,
    frame,
    marginLeft,
    times,
    directions,
    chance,
    nowX,
    timeZone,
    locale,
    chart,
    font,
    likelyFont,
}: PlotDrawingProps) {
    const { x, plotWidth } = frame

    return (
        <Group>
            {layout.spans.map(({ top, bottom }) => (
                <RoundedRect
                    key={top}
                    x={marginLeft}
                    y={top}
                    width={plotWidth}
                    height={bottom - top}
                    r={PANEL_RADIUS}
                    color={chart.grid}
                    opacity={0.4}
                />
            ))}
            {nowX !== null &&
                layout.spans.map(({ top, bottom }) => (
                    <Group
                        key={top}
                        clip={rrect(rect(marginLeft, top, plotWidth, bottom - top), PANEL_RADIUS, PANEL_RADIUS)}
                    >
                        <Rect
                            x={marginLeft}
                            y={top}
                            width={Math.max(0, nowX - marginLeft)}
                            height={bottom - top}
                            color={chart.grid}
                            opacity={0.6}
                        />
                    </Group>
                ))}
            {layout.rows.map((row, i) => (
                <PanelDrawing
                    key={row.variable}
                    row={row}
                    series={series}
                    scale={scales[i]}
                    frame={frame}
                    marginLeft={marginLeft}
                    times={times}
                    directions={directions}
                    chance={chance}
                    chart={chart}
                    font={font}
                    likelyFont={likelyFont}
                />
            ))}
            <CanvasDayGrid
                x={x}
                start={times[0]}
                end={times[times.length - 1]}
                timeZone={timeZone}
                locale={locale}
                spans={layout.spans}
                labelY={layout.plotBottom + 16}
                lineColor={chart.border}
                labelColor={chart.muted}
                font={font}
            />
            {nowX !== null &&
                layout.spans.map(({ top, bottom }) => (
                    <Line
                        key={top}
                        p1={vec(nowX, top)}
                        p2={vec(nowX, bottom)}
                        color={chart.foreground}
                        style="stroke"
                        strokeWidth={1}
                    >
                        <DashPathEffect intervals={NOW_INTERVALS} />
                    </Line>
                ))}
        </Group>
    )
})

interface SelectionDrawingProps {
    selection: OverviewSelection
    layout: OverviewLayout
    chart: ChartTheme
    font: SkFont | null
}

const SelectionDrawing = ({ selection: { x, labelX, label, dots }, layout, chart, font }: SelectionDrawingProps) => (
    <Group>
        <CanvasText
            font={font}
            text={label}
            x={labelX}
            y={layout.plotTop - 7}
            color={chart.foreground}
            anchor="middle"
        />
        {layout.spans.map(({ top, bottom }) => (
            <Line key={top} p1={vec(x, top)} p2={vec(x, bottom)} color={chart.muted} style="stroke" strokeWidth={1} />
        ))}
        {dots.map(({ key, cy, isSecondary }) => (
            <Group key={key}>
                <Circle cx={x} cy={cy} r={isSecondary ? 3 : 4} color={isSecondary ? chart.card : chart.median} />
                <Circle
                    cx={x}
                    cy={cy}
                    r={isSecondary ? 3 : 4}
                    color={isSecondary ? chart.median : chart.card}
                    style="stroke"
                    strokeWidth={isSecondary ? 1.5 : 2}
                />
            </Group>
        ))}
    </Group>
)

interface AxisDrawingProps {
    layout: OverviewLayout
    scales: PanelScale[]
    marginLeft: number
    panelNames: string[]
    hasChance: boolean
    chart: ChartTheme
    font: SkFont | null
    nameFont: SkFont | null
}

// The axis stays while the plot scrolls under it: the tick labels on a card-coloured column and the panel names in
// the panels' corners.
const AxisDrawing = ({
    layout,
    scales,
    marginLeft,
    panelNames,
    hasChance,
    chart,
    font,
    nameFont,
}: AxisDrawingProps) => (
    <Group>
        <Rect x={0} y={0} width={marginLeft} height={layout.totalHeight} color={chart.card} />
        {layout.rows.map(({ variable, top, bottom }, i) => (
            <Group key={variable}>
                {scales[i].ticks.map((tick) => (
                    <CanvasText
                        key={tick}
                        font={font}
                        text={formatYTick(tick)}
                        x={marginLeft - 6}
                        y={scales[i].y(tick) + BASELINE_SHIFT}
                        color={chart.muted}
                        anchor="end"
                    />
                ))}
                {variable === Variable.Precip && hasChance && (
                    <CanvasText
                        font={font}
                        text="%"
                        x={marginLeft - 6}
                        y={getChanceY(bottom) + BASELINE_SHIFT}
                        color={chart.muted}
                        anchor="end"
                    />
                )}
                <CanvasText
                    font={nameFont}
                    text={panelNames[i]}
                    x={marginLeft + 6}
                    y={top + PANEL_NAME_FONT_SIZE + 1}
                    color={chart.muted}
                    halo={{ color: chart.card, width: NAME_HALO_WIDTH }}
                />
            </Group>
        ))}
    </Group>
)

interface IProps {
    // The visible width; the plot is wider and moves under it by `scrollX`.
    width: number
    scrollX: SharedValue<number>
    layout: OverviewLayout
    series: OverviewMedians
    scales: PanelScale[]
    frame: OverviewFrame
    marginLeft: number
    times: Date[]
    directions: (number | null)[] | null
    chance: (number | null)[] | null
    nowX: number | null
    // "now" over the now line, or nothing while a slot is picked.
    nowLabel: string
    selection: OverviewSelection | null
    // The panels' names with their units, in the order of `layout.rows`.
    panelNames: string[]
    timeZone: string
    locale: string
    chart: ChartTheme
}

// Drawn on one screen-wide GPU canvas: on Android react-native-svg rasterises a whole <Svg> on the CPU after any
// change; here the plot is recorded once and replayed shifted by the scroll offset on the UI thread, so a scroll
// renders nothing in React and a change redraws no bitmap.
export function OverviewCanvas({
    width,
    scrollX,
    layout,
    series,
    scales,
    frame,
    marginLeft,
    times,
    directions,
    chance,
    nowX,
    nowLabel,
    selection,
    panelNames,
    timeZone,
    locale,
    chart,
}: IProps) {
    const { regular, semiBold, panelName, nowLabel: nowFont, axis } = useChartFonts()

    const nowLabelWidth = nowFont ? getAdvanceWidth(nowFont, nowLabel) : 0
    const plotTransform = useDerivedValue(() => [{ translateX: -scrollX.get() }])
    // The plot's visible left edge, in the drawing's x, is the scroll offset plus the pinned axis.
    const nowLabelX = useDerivedValue(() =>
        nowX === null ? 0 : getNowLabelStart(nowX, nowLabelWidth, scrollX.get() + marginLeft),
    )

    return (
        <Canvas
            testID="overview-canvas"
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, width, height: layout.totalHeight }}
        >
            <Group transform={plotTransform}>
                <PlotDrawing
                    layout={layout}
                    series={series}
                    scales={scales}
                    frame={frame}
                    marginLeft={marginLeft}
                    times={times}
                    directions={directions}
                    chance={chance}
                    nowX={nowX}
                    timeZone={timeZone}
                    locale={locale}
                    chart={chart}
                    font={regular}
                    likelyFont={semiBold}
                />
                {nowX !== null && (
                    <Text
                        font={nowFont}
                        text={nowLabel}
                        x={nowLabelX}
                        y={layout.plotTop - 7}
                        color={chart.foreground}
                    />
                )}
                {selection && <SelectionDrawing selection={selection} layout={layout} chart={chart} font={semiBold} />}
            </Group>
            <AxisDrawing
                layout={layout}
                scales={scales}
                marginLeft={marginLeft}
                panelNames={panelNames}
                hasChance={chance !== null}
                chart={chart}
                font={axis}
                nameFont={panelName}
            />
        </Canvas>
    )
}
