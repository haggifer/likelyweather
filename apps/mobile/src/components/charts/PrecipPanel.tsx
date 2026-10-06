import { clamp } from '@fa/chart-core/plot-geometry'
import { formatYTick, getYDomain, getYTicks } from '@fa/chart-core/scales'
import { Series } from '@fa/shared/api'
import { formatNumber, formatPercent, formatPeriodLabel, formatTime } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { addHours, getLocalDateKey, toIsoMinute } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { scaleLinear } from 'd3-scale'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useTheme } from '../../hooks/useTheme'
import { ScrubSurface } from './ScrubSurface'

const HEIGHT = 230
const MARGIN = { top: 8, right: 8, bottom: 40, left: 36 }
const MAX_BAR_WIDTH = 28
const BAR_RATIO = 0.7
const TICK_HALF_WIDTH = 7
// Below this width per window the hour and chance labels touch, so every other one is shown.
const MIN_WIDTH_PER_LABEL = 28
const HOUR_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', hourCycle: 'h23' }

const styles = StyleSheet.create({
    details: { marginTop: 8, gap: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    small: { fontSize: 12 },
    strong: { fontSize: 12, fontWeight: '600' },
})

// A 6-hour total belongs to the day of its last hour; a new day starts where that day changes.
const getDayStartIndexes = (steps: string[], timeZone: string) => {
    const dayKeys = steps.map((step) => getLocalDateKey(new Date(new Date(step).getTime() - 1).toISOString(), timeZone))

    return steps.flatMap((_, i) => (i > 0 && dayKeys[i] !== dayKeys[i - 1] ? [i] : []))
}

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
// A tap or a drag picks a window and lists its numbers below.
export function PrecipPanel({ steps, series, median, chance, timeZone, locale, windowHours }: IProps) {
    const t = useTranslations('city')
    const { chart, colors } = useTheme()
    const { width, onLayout } = useLayoutWidth()

    const [selected, setSelected] = useState<number | null>(null)

    const domain = getYDomain([...median, ...series.flatMap((s) => s.values)], Variable.Precip)
    const yTicks = getYTicks(domain, Variable.Precip, 3)
    const plotBottom = HEIGHT - MARGIN.bottom
    const plotRight = width - MARGIN.right
    const slotWidth = Math.max(1, (plotRight - MARGIN.left) / steps.length)
    const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * BAR_RATIO)
    const labelEvery = slotWidth < MIN_WIDTH_PER_LABEL ? 2 : 1
    const y = scaleLinear().domain(domain).range([plotBottom, MARGIN.top])
    const getCenter = (i: number) => MARGIN.left + (i + 0.5) * slotWidth
    const dayStarts = getDayStartIndexes(steps, timeZone)

    const handleScrub = (touchX: number) =>
        setSelected(clamp(Math.floor((touchX - MARGIN.left) / slotWidth), 0, steps.length - 1))

    return (
        <View>
            <View onLayout={onLayout}>
                {width === 0 && <View style={{ height: HEIGHT }} />}
                {width > 0 && (
                    <ScrubSurface onScrub={handleScrub}>
                        <Svg width={width} height={HEIGHT}>
                            {yTicks.map((tick) => (
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
                                            <Rect
                                                x={center - barWidth / 2}
                                                y={y(value)}
                                                width={barWidth}
                                                height={Math.max(0, plotBottom - y(value))}
                                                rx={3}
                                                fill={chart.band}
                                                opacity={0.55}
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
                                        {i % labelEvery === 0 && (
                                            <G>
                                                <SvgText
                                                    x={center}
                                                    y={plotBottom + 14}
                                                    textAnchor="middle"
                                                    fontSize={10}
                                                    fill={chart.muted}
                                                >
                                                    {formatTime(step, timeZone, locale, HOUR_FORMAT)}
                                                </SvgText>
                                                <SvgText
                                                    x={center}
                                                    y={plotBottom + 28}
                                                    textAnchor="middle"
                                                    fontSize={10}
                                                    fontWeight="600"
                                                    fill={chart.foreground}
                                                >
                                                    {formatPercent(chance[i])}
                                                </SvgText>
                                            </G>
                                        )}
                                    </G>
                                )
                            })}
                        </Svg>
                    </ScrubSurface>
                )}
            </View>
            {selected !== null && (
                <View style={styles.details}>
                    <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                        {formatWindowLabel(steps[selected], windowHours, timeZone, locale)}
                    </Text>
                    <View style={styles.row}>
                        <Text style={[styles.strong, { color: colors.foreground }]}>{t('medianTotal')}</Text>
                        <Text style={[styles.strong, { color: colors.foreground }]}>
                            {formatNumber(median[selected])} mm
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[styles.small, { color: colors.foreground }]}>{t('chanceOfRain')}</Text>
                        <Text style={[styles.small, { color: colors.foreground }]}>
                            {formatPercent(chance[selected])}
                        </Text>
                    </View>
                    {series.map((s) => (
                        <View key={s.modelId} style={styles.row}>
                            <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                                {MODEL_BY_ID[s.modelId].name}
                            </Text>
                            <Text style={[styles.small, { color: colors.foreground }]}>
                                {formatNumber(s.values[selected])}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}
