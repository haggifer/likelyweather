import { Series } from '@fa/shared/api'
import { formatNumber, formatWindDirection } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Eye, EyeOff } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { LineSwatch } from '../ui/LineSwatch'
import { Text } from '../ui/Text'

interface LegendRow {
    modelId: ModelId
    value: number | null
    isHidden: boolean
}

const ROW_HEIGHT = 36
const EYE_SIZE = 24
// The eye is drawn at 24 px and takes taps across 36 px, the web's `pointer-coarse:after:-inset-1.5`.
const EYE_HIT_SLOP = (ROW_HEIGHT - EYE_SIZE) / 2
// The web's phone legend clips the model swatches to 12 px; their dashes still show.
const MODEL_SWATCH_WIDTH = 12
const COLUMNS = 2

const styles = StyleSheet.create({
    legend: { gap: 8 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 18 },
    readout: { flexShrink: 1, fontSize: 12, fontWeight: '500' },
    direction: { fontWeight: '400' },
    reset: { fontSize: 12, fontWeight: '500' },
    median: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 2, borderRadius: 6 },
    medianName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW_HEIGHT },
    medianText: { fontSize: 13, fontWeight: '600' },
    medianUnit: { fontSize: 12, fontWeight: '400' },
    grid: { gap: 2 },
    gridRow: { flexDirection: 'row', gap: 12 },
    cell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: ROW_HEIGHT, paddingHorizontal: 6 },
    name: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    nameText: { flexShrink: 1, fontSize: 12, lineHeight: 15 },
    value: { minWidth: 32, textAlign: 'right', fontSize: 12, fontWeight: '500' },
    eye: { width: EYE_SIZE, height: EYE_SIZE, alignItems: 'center', justifyContent: 'center' },
    hint: { fontSize: 11, lineHeight: 15 },
})

const getLegendRows = (series: Series[], readoutIndex: number, hidden: ModelId[]): LegendRow[] =>
    series
        .map((s) => ({
            modelId: s.modelId,
            value: s.values[readoutIndex] ?? null,
            isHidden: hidden.includes(s.modelId),
        }))
        .sort((a, b) => Number(a.isHidden) - Number(b.isHidden) || (b.value ?? -Infinity) - (a.value ?? -Infinity))

// Rows fill the two columns left to right, highest first, as the web's two-column grid does.
const toGridRows = (rows: LegendRow[]) =>
    Array.from({ length: Math.ceil(rows.length / COLUMNS) }, (_, i) => rows.slice(i * COLUMNS, (i + 1) * COLUMNS))

// The median as the chart draws it: thicker than a model and round-capped.
const MedianSwatch = ({ color }: { color: string }) => (
    <Svg width={18} height={6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Line x1={2} x2={16} y1={3} y2={3} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </Svg>
)

interface IProps {
    series: Series[]
    median: number | null
    readoutIndex: number
    readoutLabel: string
    variable: Variable
    // The median wind direction at the readout time: a phone can't hover the arrows, so the readout names it.
    direction?: number | null
    hidden: ModelId[]
    isMedianHidden: boolean
    onToggleHidden: (id: ModelId) => void
    onToggleMedian: () => void
    onReset: () => void
}

// The models at the chart's readout time in two columns, highest first, under the median; the eye hides a model, the
// median too.
export function ModelLegend({
    series,
    median,
    readoutIndex,
    readoutLabel,
    variable,
    direction = null,
    hidden,
    isMedianHidden,
    onToggleHidden,
    onToggleMedian,
    onReset,
}: IProps) {
    const t = useTranslations('legend')
    const tc = useTranslations('chart')
    const { colors, chart } = useTheme()

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = getLegendRows(series, readoutIndex, hidden)
    const isChanged = hidden.length > 0 || isMedianHidden
    const muted = colors['muted-foreground']

    return (
        <View style={styles.legend}>
            <View style={styles.header}>
                <Text style={[styles.readout, { color: colors.foreground }]}>
                    {readoutLabel}
                    {direction !== null && (
                        <Text style={[styles.direction, { color: muted }]}>
                            {'  '}
                            {tc('windFrom', { direction: formatWindDirection(direction, tc('compass').split(',')) })}
                        </Text>
                    )}
                </Text>
                {isChanged && (
                    <Pressable onPress={onReset} hitSlop={8} accessibilityRole="button">
                        <Text style={[styles.reset, { color: colors.primary }]}>{t('reset')}</Text>
                    </Pressable>
                )}
            </View>
            <View style={[styles.median, { backgroundColor: colors.muted, opacity: isMedianHidden ? 0.45 : 1 }]}>
                <View style={styles.medianName}>
                    <MedianSwatch color={chart.median} />
                    <Text
                        style={[
                            styles.medianText,
                            { color: colors.foreground },
                            isMedianHidden && { textDecorationLine: 'line-through' },
                        ]}
                    >
                        {t('median')}
                    </Text>
                </View>
                {!isMedianHidden && (
                    <Text isTabular style={[styles.medianText, { color: colors.foreground }]}>
                        {formatNumber(median, decimals)}{' '}
                        <Text style={[styles.medianUnit, { color: muted }]}>{unit}</Text>
                    </Text>
                )}
                <Pressable
                    onPress={onToggleMedian}
                    hitSlop={EYE_HIT_SLOP}
                    style={styles.eye}
                    // The web's aria-pressed: a toggle that is on while the median is hidden.
                    accessibilityRole="togglebutton"
                    accessibilityLabel={isMedianHidden ? t('showMedian') : t('hideMedian')}
                    accessibilityState={{ checked: isMedianHidden }}
                >
                    {isMedianHidden ? <EyeOff size={14} color={muted} /> : <Eye size={14} color={muted} />}
                </Pressable>
            </View>
            <View style={styles.grid}>
                {toGridRows(rows).map((pair) => (
                    <View key={pair[0].modelId} style={styles.gridRow}>
                        {pair.map(({ modelId, value, isHidden }) => {
                            const model = MODEL_BY_ID[modelId]

                            return (
                                <View key={modelId} style={[styles.cell, isHidden && { opacity: 0.45 }]}>
                                    <View style={styles.name}>
                                        <LineSwatch color={model.color} dash={model.dash} width={MODEL_SWATCH_WIDTH} />
                                        <Text
                                            style={[
                                                styles.nameText,
                                                { color: colors.foreground },
                                                isHidden && { textDecorationLine: 'line-through' },
                                            ]}
                                        >
                                            {model.name}
                                        </Text>
                                    </View>
                                    <Text isTabular style={[styles.value, { color: colors.foreground }]}>
                                        {isHidden ? '' : formatNumber(value, decimals)}
                                    </Text>
                                    <Pressable
                                        onPress={() => onToggleHidden(modelId)}
                                        hitSlop={EYE_HIT_SLOP}
                                        style={styles.eye}
                                        accessibilityRole="button"
                                        accessibilityLabel={
                                            isHidden
                                                ? t('show', { model: model.name })
                                                : t('hide', { model: model.name })
                                        }
                                    >
                                        {isHidden ? (
                                            <EyeOff size={14} color={muted} />
                                        ) : (
                                            <Eye size={14} color={muted} />
                                        )}
                                    </Pressable>
                                </View>
                            )
                        })}
                        {pair.length < COLUMNS && <View style={styles.cell} />}
                    </View>
                ))}
            </View>
            <Text style={[styles.hint, { color: muted }]}>{t('hintTouch')}</Text>
        </View>
    )
}
