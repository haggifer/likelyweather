import { useAnimatedDomain } from '@fa/chart-core/hooks/useAnimatedDomain'
import { clamp, getBarWidth, getNowX } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import {
    buildSpaghettiGeometry,
    getNearestIndex,
    getSpanIndex,
    getSumBarCenter,
    getSumSpan,
    Margin,
} from '@fa/chart-core/spaghetti-geometry'
import { Series } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatPeriodLabel, formatStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScaleTime } from 'd3-scale'
import { useId, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import { getFontFamily } from '../../theme/fonts'
import { LineSwatch } from '../ui/LineSwatch'
import { Text } from '../ui/Text'
import { DayGrid } from './DayGrid'
import { ScrubSurface } from './ScrubSurface'
import { WindArrows } from './WindArrows'

interface DrawnBar {
    i: number
    center: number
}

interface TooltipRow {
    modelId: ModelId
    value: number
}

const ARROW_ROW = 26
const MAX_TICK_WIDTH = 16
const HOVER_LABEL_HALF_WIDTH = 34
const PERIOD_LABEL_HALF_WIDTH = 50
const UNIT_LABEL_WIDTH = 28
const TOOLTIP_SWATCH_WIDTH = 12
// Phones get a shorter plot so the model list under it stays in view while scrubbing, as on the web.
const NARROW_WIDTH = 480
const NARROW_HEIGHT = 280

const styles = StyleSheet.create({
    tooltip: {
        position: 'absolute',
        top: 8,
        minWidth: 150,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    model: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    small: { fontSize: 12 },
    strong: { fontSize: 12, fontWeight: '600' },
    value: { fontWeight: '500' },
})

const getMargin = (compact: boolean, hasArrows: boolean): Margin => ({
    top: compact ? 14 : 24,
    right: 12,
    bottom: (compact ? 22 : 30) + (hasArrows ? ARROW_ROW : 0),
    left: compact ? 34 : 44,
})

const getSeriesYDomain = (series: Series[], variable: Variable) =>
    getYDomain(
        series.flatMap((s) => s.values),
        variable,
    )

// Bars that would overflow the plot are not drawn.
const getDrawnBars = (
    times: Date[],
    x: ScaleTime<number, number>,
    stepMs: number,
    barWidth: number,
    [left, right]: [number, number],
): DrawnBar[] =>
    times
        .map((time, i) => ({ i, center: x(getSumBarCenter(time, stepMs)) }))
        .filter(({ center }) => center - barWidth / 2 >= left && center + barWidth / 2 <= right)

const getHoverLabel = (step: string, span: [Date, Date] | null, timeZone: string, locale: string) =>
    span
        ? formatPeriodLabel(span[0].toISOString(), span[1].toISOString(), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

const getTooltipRows = (series: Series[], index: number) =>
    series
        .map((s) => ({ modelId: s.modelId, value: s.values[index] }))
        .filter((r): r is TooltipRow => r.value !== null)
        .sort((a, b) => b.value - a.value)

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

// Every model as a line (precipitation: a tick per model over the median bar), the min–max and interquartile bands,
// the median, local day boundaries and the now line, as on the web. A finger scrubs the 3-hour slots.
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
    height: heightProp = 340,
    compact = false,
    showTooltip = false,
    isMedianHidden = false,
}: IProps) {
    const t = useTranslations('chart')
    const { chart, colors } = useTheme()
    const isReducedMotion = useReducedMotion()
    const { width, onLayout } = useLayoutWidth()
    const clipId = useId().replace(/[^\w-]/g, '')

    const height = width < NARROW_WIDTH ? Math.min(heightProp, NARROW_HEIGHT) : heightProp
    const info = VARIABLE_BY_ID[variable]
    const isBars = variable === Variable.Precip
    const hasArrows = Boolean(directions)
    const margin = useMemo(() => getMargin(compact, hasArrows), [compact, hasArrows])
    const target = useMemo(() => getSeriesYDomain(series, variable), [series, variable])
    // A refresh of the same variable eases the axis to its new range; another variable jumps.
    const domain = useAnimatedDomain(target, variable, isReducedMotion)
    const geometry = useMemo(
        () => buildSpaghettiGeometry({ steps, series, stats, width: Math.max(width, 1), height, domain, margin }),
        [steps, series, stats, width, height, domain, margin],
    )

    const { x, y, times } = geometry
    const plotBottom = height - margin.bottom
    const plotRight = width - margin.right
    const nowX = getNowX(x, now, margin.left, plotRight)
    const yTicks = getYTicks(domain, variable, compact ? 3 : 5)
    const stepMs = times.length > 1 ? times[1].getTime() - times[0].getTime() : 3 * HOUR_MS
    const barWidth = getBarWidth(x, times[0], stepMs)
    const tickWidth = Math.min(barWidth, MAX_TICK_WIDTH)
    const bars = isBars ? getDrawnBars(times, x, stepMs, barWidth, [margin.left, plotRight]) : []
    const minIndex = isBars && bars.length ? bars[0].i : 0
    const maxIndex = isBars && bars.length ? bars[bars.length - 1].i : times.length - 1
    const hover = hoverIndex !== null && times[hoverIndex] ? hoverIndex : null
    const hoverSpan = hover !== null && isBars ? getSumSpan(times[hover], stepMs) : null
    const hoverTime = hover === null ? null : hoverSpan ? getSumBarCenter(times[hover], stepMs) : times[hover]
    const hoverX = hoverTime ? x(hoverTime) : null
    const hoverLabel = hover === null ? null : getHoverLabel(steps[hover], hoverSpan, timeZone, locale)
    const labelHalfWidth = hoverSpan ? PERIOD_LABEL_HALF_WIDTH : HOVER_LABEL_HALF_WIDTH
    const hoverLabelX =
        hoverX === null
            ? null
            : clamp(hoverX, margin.left + UNIT_LABEL_WIDTH + labelHalfWidth, plotRight - labelHalfWidth)
    const spanLeft = hoverSpan ? Math.max(margin.left, x(hoverSpan[0])) : 0
    const spanRight = hoverSpan ? Math.min(plotRight, x(hoverSpan[1])) : 0
    const tooltipRows = hover !== null && showTooltip ? getTooltipRows(series, hover) : []
    const area = { plot: { left: margin.left, top: margin.top, right: plotRight, bottom: plotBottom }, width, height }

    const handleScrub = (touchX: number) => {
        const at = x.invert(touchX)
        const index = isBars ? getSpanIndex(times, at, stepMs) : getNearestIndex(times, at)

        onHoverIndex(clamp(index, minIndex, maxIndex))
    }

    return (
        <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            {width === 0 && <View style={{ height }} />}
            {width > 0 && (
                <ScrubSurface onScrub={handleScrub} area={area} onClear={() => onHoverIndex(null)}>
                    <Svg width={width} height={height}>
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
                            <G key={tick}>
                                <Line x1={margin.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={chart.grid} />
                                <SvgText
                                    x={margin.left - 6}
                                    y={y(tick) + 3.5}
                                    textAnchor="end"
                                    fontSize={compact ? 10 : 11}
                                    fontFamily={getFontFamily('400')}
                                    fill={chart.muted}
                                >
                                    {formatYTick(tick, info.decimals === 0)}
                                </SvgText>
                            </G>
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
                            fontSize={compact ? 10 : 11}
                        />
                        {!compact && (
                            <SvgText
                                x={margin.left}
                                y={margin.top - 8}
                                fontSize={10}
                                fontFamily={getFontFamily('400')}
                                fill={chart.muted}
                            >
                                {info.unit}
                            </SvgText>
                        )}
                        <Defs>
                            <ClipPath id={clipId}>
                                <Rect
                                    x={margin.left}
                                    y={margin.top}
                                    width={Math.max(0, plotRight - margin.left)}
                                    height={Math.max(0, plotBottom - margin.top)}
                                />
                            </ClipPath>
                        </Defs>
                        {/* The bands span every model while the y-domain fits the visible ones, so they are clipped. */}
                        <G clipPath={`url(#${clipId})`}>
                            {!isBars && (
                                <Path d={geometry.outerBand} fill={chart.band} opacity={chart.bandOuterOpacity} />
                            )}
                            {!isBars && (
                                <Path d={geometry.innerBand} fill={chart.band} opacity={chart.bandInnerOpacity} />
                            )}
                            {hoverSpan && (
                                <Rect
                                    x={spanLeft}
                                    y={margin.top}
                                    width={Math.max(0, spanRight - spanLeft)}
                                    height={plotBottom - margin.top}
                                    fill={chart.grid}
                                    opacity={0.8}
                                />
                            )}
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
                                                opacity={hover === i ? 0.95 : 0.6}
                                            />
                                        )}
                                        {series.map((s) => {
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
                                        })}
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
                                <Path
                                    d={geometry.median}
                                    fill="none"
                                    stroke={chart.median}
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                />
                            )}
                        </G>
                        {nowX !== null && (
                            <G>
                                <Line
                                    x1={nowX}
                                    x2={nowX}
                                    y1={margin.top}
                                    y2={plotBottom}
                                    stroke={chart.foreground}
                                    strokeDasharray="4 3"
                                />
                                {hover === null && (
                                    <SvgText
                                        x={nowX + 4}
                                        y={margin.top + 10}
                                        fontSize={10}
                                        fontFamily={getFontFamily('600')}
                                        fill={chart.foreground}
                                    >
                                        {t('now')}
                                    </SvgText>
                                )}
                            </G>
                        )}
                        {directions && (
                            <WindArrows
                                x={x}
                                times={times}
                                directions={directions}
                                y={height - ARROW_ROW / 2 - 2}
                                color={chart.foreground}
                                mutedColor={chart.muted}
                            />
                        )}
                        {hover !== null && hoverX !== null && (
                            <G>
                                {!isBars && (
                                    <Line
                                        x1={hoverX}
                                        x2={hoverX}
                                        y1={margin.top}
                                        y2={plotBottom}
                                        stroke={chart.muted}
                                    />
                                )}
                                {!compact && hoverLabelX !== null && (
                                    <SvgText
                                        x={hoverLabelX}
                                        y={margin.top - 8}
                                        textAnchor="middle"
                                        fontSize={11}
                                        fontFamily={getFontFamily('600')}
                                        fill={chart.foreground}
                                    >
                                        {hoverLabel}
                                    </SvgText>
                                )}
                                {!isBars &&
                                    series.map((s) => {
                                        const v = s.values[hover]

                                        if (v === null) return null

                                        return (
                                            <Circle
                                                key={s.modelId}
                                                cx={hoverX}
                                                cy={y(v)}
                                                r={3.5}
                                                fill={MODEL_BY_ID[s.modelId].color}
                                                stroke={chart.card}
                                                strokeWidth={2}
                                            />
                                        )
                                    })}
                                {!isBars && !isMedianHidden && stats.median[hover] !== null && (
                                    <Circle
                                        cx={hoverX}
                                        cy={y(stats.median[hover] as number)}
                                        r={4.5}
                                        fill={chart.median}
                                        stroke={chart.card}
                                        strokeWidth={2}
                                    />
                                )}
                            </G>
                        )}
                    </Svg>
                </ScrubSurface>
            )}
            {showTooltip && hover !== null && hoverX !== null && (
                <View
                    pointerEvents="none"
                    style={[
                        styles.tooltip,
                        { backgroundColor: colors.popover, borderColor: colors.border },
                        hoverX > width / 2 ? { right: width - hoverX + 10 } : { left: hoverX + 10 },
                    ]}
                >
                    <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{hoverLabel}</Text>
                    <View style={styles.row}>
                        <Text style={[styles.strong, { color: colors.foreground }]}>{t('median')}</Text>
                        <Text isTabular style={[styles.strong, { color: colors.foreground }]}>
                            {formatNumber(stats.median[hover], info.decimals)}
                        </Text>
                    </View>
                    {/* A dashed swatch and a muted name, as on the web: colour alone would not tell the models apart. */}
                    {tooltipRows.map((r) => (
                        <View key={r.modelId} style={styles.row}>
                            <View style={styles.model}>
                                <LineSwatch
                                    color={MODEL_BY_ID[r.modelId].color}
                                    dash={MODEL_BY_ID[r.modelId].dash}
                                    width={TOOLTIP_SWATCH_WIDTH}
                                />
                                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                                    {MODEL_BY_ID[r.modelId].name}
                                </Text>
                            </View>
                            <Text isTabular style={[styles.small, styles.value, { color: colors.foreground }]}>
                                {formatNumber(r.value, info.decimals)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}
