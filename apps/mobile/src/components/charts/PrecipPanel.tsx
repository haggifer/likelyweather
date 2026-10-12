import { clamp } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import { getInitialScrollLeft, getMinSlotWidth, getScrollWidth } from '@fa/chart-core/scroll-geometry'
import { Series } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber, formatPercent, formatPeriodLabel, formatTime } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { addHours, getLocalDateKey, toIsoMinute } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { scaleLinear } from 'd3-scale'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useNow } from '../../hooks/useNow'
import { useTheme } from '../../hooks/useTheme'
import { getFontFamily } from '../../theme/fonts'
import { Text } from '../ui/Text'
import { getTopRoundedBarPath } from './bar-path'
import { TapSurface } from './TapSurface'

const HEIGHT = 230
const MARGIN = { top: 8, right: 8, bottom: 40, left: 36 }
// Recharts' band on the web: a bar takes about 80 % of its window, at most 28 px, with its top corners rounded.
const MAX_BAR_WIDTH = 28
const BAR_RATIO = 0.8
const BAR_RADIUS = 4
const TICK_HALF_WIDTH = 7
const TICK_FONT_SIZE = 10
// A window is two 3-hour slots, so it gets two slots' minimum width.
const WINDOW_MIN_WIDTH = 2 * getMinSlotWidth(TICK_FONT_SIZE)
const HOUR_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', hourCycle: 'h23' }

const styles = StyleSheet.create({
    details: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    models: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, marginTop: 4 },
    model: { width: '45%', flexGrow: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    small: { fontSize: 12 },
    strong: { fontSize: 12, fontWeight: '600' },
})

// A 6-hour total belongs to the day of its last hour; a new day starts where that day changes.
const getDayStartIndexes = (steps: string[], timeZone: string) => {
    const dayKeys = steps.map((step) => getLocalDateKey(new Date(new Date(step).getTime() - 1).toISOString(), timeZone))

    return steps.flatMap((_, i) => (i > 0 && dayKeys[i] !== dayKeys[i - 1] ? [i] : []))
}

// How many windows have passed at `now`; each step is labelled by the hour its window ends.
const getElapsedWindows = (steps: string[], windowHours: number, now: Date) =>
    (now.getTime() - new Date(steps[0]).getTime()) / (windowHours * HOUR_MS) + 1

const formatWindowLabel = (step: string, windowHours: number, timeZone: string, locale: string) =>
    formatPeriodLabel(toIsoMinute(addHours(new Date(step), -windowHours)), step, timeZone, locale)

interface IProps {
    steps: string[]
    series: Series[]
    median: (number | null)[]
    chance: (number | null)[]
    timeZone: string
    locale: string
    windowHours: number
}

// 6-hour totals: the median as a bar with a tick per model, each window's end hour and chance of rain under it.
// A tap on the plot picks a window and lists its numbers under the panel until another is picked or a tap outside the
// plot clears it, as on the web's phone panel; a drag scrolls the windows.
export function PrecipPanel({ steps, series, median, chance, timeZone, locale, windowHours }: IProps) {
    const t = useTranslations('city')
    const { chart, colors } = useTheme()
    const { width, onLayout } = useLayoutWidth()
    const now = useNow()

    const [selected, setSelected] = useState<number | null>(null)

    const domain = getYDomain([...median, ...series.flatMap((s) => s.values)], Variable.Precip)
    const yTicks = getYTicks(domain, Variable.Precip, 3)
    const plotBottom = HEIGHT - MARGIN.bottom
    const contentWidth = getScrollWidth(width, steps.length, WINDOW_MIN_WIDTH, MARGIN.left + MARGIN.right)
    const plotRight = contentWidth - MARGIN.right
    const slotWidth = Math.max(1, (plotRight - MARGIN.left) / steps.length)
    const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * BAR_RATIO)
    const y = scaleLinear().domain(domain).range([plotBottom, MARGIN.top])
    const getCenter = (i: number) => MARGIN.left + (i + 0.5) * slotWidth
    const dayStarts = getDayStartIndexes(steps, timeZone)
    const plot = { left: MARGIN.left, top: MARGIN.top, right: plotRight, bottom: plotBottom }
    const initialScrollLeft = getInitialScrollLeft(
        MARGIN.left + getElapsedWindows(steps, windowHours, now) * slotWidth,
        { slotWidth, insetLeft: MARGIN.left, contentWidth, viewportWidth: width },
    )

    // The panel has no now line; it opens at the window under way, like the charts at their now line.
    const { ref: scrollRef, onContentSizeChange } = useChartScroll(steps[0], initialScrollLeft)

    const handleSelect = (touchX: number) =>
        setSelected(clamp(Math.floor((touchX - MARGIN.left) / slotWidth), 0, steps.length - 1))

    return (
        <View>
            <View onLayout={onLayout}>
                {width === 0 && <View style={{ height: HEIGHT }} />}
                {width > 0 && (
                    <View>
                        <ScrollView ref={scrollRef} horizontal onContentSizeChange={onContentSizeChange}>
                            <TapSurface onSelect={handleSelect} plot={plot} onClear={() => setSelected(null)}>
                                <Svg width={contentWidth} height={HEIGHT}>
                                    {yTicks.map((tick) => (
                                        <Line
                                            key={tick}
                                            x1={MARGIN.left}
                                            x2={plotRight}
                                            y1={y(tick)}
                                            y2={y(tick)}
                                            stroke={chart.grid}
                                        />
                                    ))}
                                    {selected !== null && (
                                        <Rect
                                            x={MARGIN.left + selected * slotWidth}
                                            y={MARGIN.top}
                                            width={slotWidth}
                                            height={plotBottom - MARGIN.top}
                                            fill={chart.grid}
                                            opacity={0.6}
                                        />
                                    )}
                                    {dayStarts.map((i) => (
                                        <Line
                                            key={steps[i]}
                                            x1={MARGIN.left + i * slotWidth}
                                            x2={MARGIN.left + i * slotWidth}
                                            y1={MARGIN.top}
                                            y2={plotBottom}
                                            stroke={chart.border}
                                        />
                                    ))}
                                    <Line
                                        x1={MARGIN.left}
                                        x2={plotRight}
                                        y1={plotBottom}
                                        y2={plotBottom}
                                        stroke={chart.border}
                                    />
                                    {steps.map((step, i) => {
                                        const value = median[i]
                                        const center = getCenter(i)

                                        return (
                                            <G key={step}>
                                                {value !== null && (
                                                    <Path
                                                        d={getTopRoundedBarPath(
                                                            center - barWidth / 2,
                                                            y(value),
                                                            barWidth,
                                                            Math.max(0, plotBottom - y(value)),
                                                            BAR_RADIUS,
                                                        )}
                                                        fill={chart.band}
                                                        opacity={i === selected ? 0.9 : 0.55}
                                                    />
                                                )}
                                                {series.map((s) => {
                                                    const v = s.values[i]
                                                    const model = MODEL_BY_ID[s.modelId]

                                                    if (v === null) return null

                                                    return (
                                                        <Line
                                                            key={s.modelId}
                                                            x1={center - TICK_HALF_WIDTH}
                                                            x2={center + TICK_HALF_WIDTH}
                                                            y1={y(v)}
                                                            y2={y(v)}
                                                            stroke={model.color}
                                                            strokeWidth={2}
                                                            strokeDasharray={model.dash}
                                                            strokeLinecap={model.dash ? 'butt' : 'round'}
                                                        />
                                                    )
                                                })}
                                                <G>
                                                    <SvgText
                                                        x={center}
                                                        y={plotBottom + 14}
                                                        textAnchor="middle"
                                                        fontSize={10}
                                                        fontFamily={getFontFamily('400')}
                                                        fill={chart.muted}
                                                    >
                                                        {formatTime(step, timeZone, locale, HOUR_FORMAT)}
                                                    </SvgText>
                                                    <SvgText
                                                        x={center}
                                                        y={plotBottom + 28}
                                                        textAnchor="middle"
                                                        fontSize={10}
                                                        fontFamily={getFontFamily('600')}
                                                        fill={chart.foreground}
                                                    >
                                                        {formatPercent(chance[i])}
                                                    </SvgText>
                                                </G>
                                            </G>
                                        )
                                    })}
                                </Svg>
                            </TapSurface>
                        </ScrollView>
                        {/* The axis stays while the bars scroll under it, on a card-coloured column. */}
                        <Svg width={width} height={HEIGHT} pointerEvents="none" style={StyleSheet.absoluteFill}>
                            <Rect x={0} y={0} width={MARGIN.left} height={HEIGHT} fill={chart.card} />
                            {yTicks.map((tick) => (
                                <SvgText
                                    key={tick}
                                    x={MARGIN.left - 6}
                                    y={y(tick) + 3.5}
                                    textAnchor="end"
                                    fontSize={TICK_FONT_SIZE}
                                    fontFamily={getFontFamily('400')}
                                    fill={chart.muted}
                                >
                                    {formatYTick(tick)}
                                </SvgText>
                            ))}
                        </Svg>
                    </View>
                )}
            </View>
            {selected !== null && (
                <View style={[styles.details, { borderTopColor: colors.border }]}>
                    <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                        {formatWindowLabel(steps[selected], windowHours, timeZone, locale)}
                    </Text>
                    <View style={styles.row}>
                        <Text style={[styles.strong, { color: colors.foreground }]}>{t('medianTotal')}</Text>
                        <Text isTabular style={[styles.strong, { color: colors.foreground }]}>
                            {formatNumber(median[selected])} mm
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[styles.small, { color: colors.foreground }]}>{t('chanceOfRain')}</Text>
                        <Text isTabular style={[styles.small, { color: colors.foreground }]}>
                            {formatPercent(chance[selected])}
                        </Text>
                    </View>
                    <View style={styles.models}>
                        {series.map((s) => (
                            <View key={s.modelId} style={styles.model}>
                                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                                    {MODEL_BY_ID[s.modelId].name}
                                </Text>
                                <Text isTabular style={[styles.small, { color: colors.foreground }]}>
                                    {formatNumber(s.values[selected])}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    )
}
