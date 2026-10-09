import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../ui/Text'

const TIME_WIDTH = 92
const CELL_WIDTH = 64
// The web's `max-h-[26.25rem]`: the table scrolls inside the card instead of stretching the page by 33 rows.
const MAX_HEIGHT = 420

const styles = StyleSheet.create({
    frame: { maxHeight: MAX_HEIGHT },
    table: { flexDirection: 'row' },
    row: { flexDirection: 'row', minHeight: 32, alignItems: 'center' },
    time: { width: TIME_WIDTH, fontSize: 12 },
    cell: { width: CELL_WIDTH, fontSize: 12, textAlign: 'right' },
    head: { fontWeight: '600' },
    headRow: { height: 40 },
})

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
}

// The chart's numbers: the rows scroll inside a capped frame, and the model columns scroll sideways while the time
// column stays put.
export function SeriesTable({ steps, series, stats, decimals, timeZone, locale }: IProps) {
    const t = useTranslations('dashboard')
    const { colors } = useTheme()

    const text = { color: colors.foreground }
    const border = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }

    return (
        <ScrollView style={styles.frame} nestedScrollEnabled>
            <View style={styles.table}>
                <View>
                    <View style={[styles.row, styles.headRow, border]}>
                        <Text style={[styles.time, styles.head, text]}>{t('time')}</Text>
                    </View>
                    {steps.map((step) => (
                        <View key={step} style={[styles.row, border]}>
                            <Text style={[styles.time, text]}>{formatStepLabel(step, timeZone, locale)}</Text>
                        </View>
                    ))}
                </View>
                <ScrollView horizontal nestedScrollEnabled>
                    <View>
                        <View style={[styles.row, styles.headRow, border]}>
                            <Text style={[styles.cell, styles.head, text]}>{t('median')}</Text>
                            {series.map((s) => (
                                <Text key={s.modelId} style={[styles.cell, styles.head, text]} numberOfLines={2}>
                                    {MODEL_BY_ID[s.modelId].name}
                                </Text>
                            ))}
                        </View>
                        {steps.map((step, i) => (
                            <View key={step} style={[styles.row, border]}>
                                <Text isTabular style={[styles.cell, styles.head, text]}>
                                    {formatNumber(stats.median[i], decimals)}
                                </Text>
                                {series.map((s) => (
                                    <Text key={s.modelId} isTabular style={[styles.cell, text]}>
                                        {formatNumber(s.values[i], decimals)}
                                    </Text>
                                ))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </ScrollView>
    )
}
