import { Series } from '@fa/shared/api'
import { formatNumber, formatWindDirection } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Eye, EyeOff } from 'lucide-react-native'
import { memo, ReactElement } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { DARK, LIGHT } from '../../theme/tokens'
import { LineSwatch } from '../ui/LineSwatch'
import { Text } from '../ui/Text'

interface LegendRow {
    modelId: ModelId
    value: number | null
    isHidden: boolean
}

interface EyeIcons {
    shown: ReactElement
    hidden: ReactElement
}

const ROW_HEIGHT = 36
const EYE_SIZE = 24
// The eye is drawn at 24 px and takes taps across 36 px, the web's `pointer-coarse:after:-inset-1.5`.
const EYE_HIT_SLOP = (ROW_HEIGHT - EYE_SIZE) / 2
// The web's phone legend clips the model swatches to 12 px; their dashes still show.
const MODEL_SWATCH_WIDTH = 12
const COLUMNS = 2
const EYE_ICON_SIZE = 14

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
    // One wrapping list rather than a view per line, so a row that moves when the values re-sort keeps its view.
    grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
    cell: {
        flexBasis: '40%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: ROW_HEIGHT,
        paddingHorizontal: 6,
    },
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

const getEyeIcons = (color: string): EyeIcons => ({
    shown: <Eye size={EYE_ICON_SIZE} color={color} />,
    hidden: <EyeOff size={EYE_ICON_SIZE} color={color} />,
})

// Shared elements, one pair per theme, so an unchanged eye is not rebuilt on every tap of the chart.
const LIGHT_EYES = getEyeIcons(LIGHT['muted-foreground'])
const DARK_EYES = getEyeIcons(DARK['muted-foreground'])

// The median as the chart draws it: thicker than a model and round-capped.
const MedianSwatch = ({ color }: { color: string }) => (
    <Svg width={18} height={6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Line x1={2} x2={16} y1={3} y2={3} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </Svg>
)

interface RowProps {
    modelId: ModelId
    // Formatted, so a tap that leaves a model's text unchanged does not re-render its row.
    value: string
    isHidden: boolean
    onToggleHidden: (id: ModelId) => void
}

// One model's row; a tap on the chart re-renders only the rows whose value text changed.
const ModelRow = memo(function ModelRow({ modelId, value, isHidden, onToggleHidden }: RowProps) {
    const t = useTranslations('legend')
    const { colors, isDark } = useTheme()

    const model = MODEL_BY_ID[modelId]
    const eyes = isDark ? DARK_EYES : LIGHT_EYES

    return (
        <View style={[styles.cell, isHidden && { opacity: 0.45 }]}>
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
                {value}
            </Text>
            <Pressable
                onPress={() => onToggleHidden(modelId)}
                hitSlop={EYE_HIT_SLOP}
                style={styles.eye}
                accessibilityRole="button"
                accessibilityLabel={isHidden ? t('show', { model: model.name }) : t('hide', { model: model.name })}
            >
                {isHidden ? eyes.hidden : eyes.shown}
            </Pressable>
        </View>
    )
})

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
    const { colors, chart, isDark } = useTheme()

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = getLegendRows(series, readoutIndex, hidden)
    const isChanged = hidden.length > 0 || isMedianHidden
    const muted = colors['muted-foreground']
    const eyes = isDark ? DARK_EYES : LIGHT_EYES

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
                    {isMedianHidden ? eyes.hidden : eyes.shown}
                </Pressable>
            </View>
            {/* Rows fill the two columns left to right, highest first, as the web's two-column grid does. */}
            <View style={styles.grid}>
                {rows.map(({ modelId, value, isHidden }) => (
                    <ModelRow
                        key={modelId}
                        modelId={modelId}
                        value={isHidden ? '' : formatNumber(value, decimals)}
                        isHidden={isHidden}
                        onToggleHidden={onToggleHidden}
                    />
                ))}
                {rows.length % COLUMNS > 0 && <View style={styles.cell} />}
            </View>
            <Text style={[styles.hint, { color: muted }]}>{t('hintTouch')}</Text>
        </View>
    )
}
