import { Series } from '@fa/shared/api'
import { formatNumber } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Eye, EyeOff, Pin } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 },
    readout: { fontSize: 12, fontWeight: '500' },
    reset: { fontSize: 12, fontWeight: '500' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingLeft: 8, borderRadius: 6 },
    name: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
    nameText: { flexShrink: 1, fontSize: 13 },
    value: { width: 60, textAlign: 'right', fontSize: 13, fontWeight: '500' },
    eye: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    hint: { fontSize: 11, lineHeight: 15 },
})

interface LegendRow {
    modelId: ModelId
    value: number | null
    isHidden: boolean
}

const getLegendRows = (series: Series[], readoutIndex: number, hidden: ModelId[]): LegendRow[] =>
    series
        .map((s) => ({
            modelId: s.modelId,
            value: s.values[readoutIndex] ?? null,
            isHidden: hidden.includes(s.modelId),
        }))
        .sort((a, b) => Number(a.isHidden) - Number(b.isHidden) || (b.value ?? -Infinity) - (a.value ?? -Infinity))

const Swatch = ({ color, dash, isThick = false }: { color: string; dash?: string; isThick?: boolean }) => (
    <Svg width={18} height={6}>
        <Line x1={1} x2={17} y1={3} y2={3} stroke={color} strokeWidth={isThick ? 4 : 2.5} strokeDasharray={dash} />
    </Svg>
)

interface IProps {
    series: Series[]
    median: number | null
    readoutIndex: number
    readoutLabel: string
    variable: Variable
    pinned: ModelId[]
    hidden: ModelId[]
    isMedianHidden: boolean
    onTogglePin: (id: ModelId) => void
    onToggleHidden: (id: ModelId) => void
    onToggleMedian: () => void
    onReset: () => void
}

// The models at the chart's readout time, highest first; a tap pins a model, the eye hides it, the median too.
export function ModelLegend({
    series,
    median,
    readoutIndex,
    readoutLabel,
    variable,
    pinned,
    hidden,
    isMedianHidden,
    onTogglePin,
    onToggleHidden,
    onToggleMedian,
    onReset,
}: IProps) {
    const t = useTranslations('legend')
    const { colors, chart } = useTheme()

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = getLegendRows(series, readoutIndex, hidden)
    const isChanged = hidden.length > 0 || pinned.length > 0 || isMedianHidden
    const eyeColor = colors['muted-foreground']

    return (
        <View style={{ gap: 4 }}>
            <View style={styles.header}>
                <Text style={[styles.readout, { color: colors.foreground }]}>{readoutLabel}</Text>
                {isChanged && (
                    <Pressable onPress={onReset} hitSlop={8} accessibilityRole="button">
                        <Text style={[styles.reset, { color: colors.primary }]}>{t('reset')}</Text>
                    </Pressable>
                )}
            </View>
            <View style={[styles.row, { backgroundColor: colors.muted, opacity: isMedianHidden ? 0.45 : 1 }]}>
                <View style={styles.name}>
                    <Swatch color={chart.median} isThick />
                    <Text
                        style={[
                            styles.nameText,
                            { color: colors.foreground, fontWeight: '600' },
                            isMedianHidden && { textDecorationLine: 'line-through' },
                        ]}
                    >
                        {t('median')}
                    </Text>
                </View>
                <Text style={[styles.value, { color: colors.foreground, fontWeight: '600' }]}>
                    {isMedianHidden ? '' : `${formatNumber(median, decimals)} ${unit}`}
                </Text>
                <Pressable
                    onPress={onToggleMedian}
                    style={styles.eye}
                    accessibilityRole="button"
                    accessibilityLabel={isMedianHidden ? t('showMedian') : t('hideMedian')}
                >
                    {isMedianHidden ? <EyeOff size={16} color={eyeColor} /> : <Eye size={16} color={eyeColor} />}
                </Pressable>
            </View>
            {rows.map(({ modelId, value, isHidden }) => {
                const model = MODEL_BY_ID[modelId]
                const isPinned = pinned.includes(modelId)

                return (
                    <View
                        key={modelId}
                        style={[
                            styles.row,
                            isPinned && { backgroundColor: colors.accent },
                            isHidden && { opacity: 0.45 },
                        ]}
                    >
                        <Pressable
                            onPress={() => onTogglePin(modelId)}
                            style={styles.name}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isPinned }}
                            accessibilityHint={isPinned ? t('unpin') : t('pin')}
                        >
                            <Swatch color={model.color} dash={model.dash} />
                            <Text
                                style={[
                                    styles.nameText,
                                    { color: colors.foreground },
                                    isHidden && { textDecorationLine: 'line-through' },
                                ]}
                            >
                                {model.name}
                            </Text>
                            {isPinned && <Pin size={12} color={eyeColor} />}
                        </Pressable>
                        <Text style={[styles.value, { color: colors.foreground }]}>
                            {isHidden ? '' : formatNumber(value, decimals)}
                        </Text>
                        <Pressable
                            onPress={() => onToggleHidden(modelId)}
                            style={styles.eye}
                            accessibilityRole="button"
                            accessibilityLabel={
                                isHidden ? t('show', { model: model.name }) : t('hide', { model: model.name })
                            }
                        >
                            {isHidden ? <EyeOff size={16} color={eyeColor} /> : <Eye size={16} color={eyeColor} />}
                        </Pressable>
                    </View>
                )
            })}
            <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>{t('hintTouch')}</Text>
        </View>
    )
}
