import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { ScrollView, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'

// The kit has no table: rows are views with the web table's bottom border, the time column 112 px and the others 72,
// or 104 for a pair's "actual (companion)".
const ROW_CLASS = 'min-h-9 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = cn(ROW_CLASS, 'h-11')
const TIME_CLASS = 'w-28 text-sm'
const CELL_CLASS = 'w-[4.5rem] text-right text-sm'
const PAIRED_CELL_CLASS = 'w-[6.5rem] text-right text-sm'

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
    // A pair reads "actual (companion)" whichever sub-tab is open (author, 2026-10-14).
    pairedRuns: PairedRuns | null
}

// The chart's numbers: the rows scroll inside a frame capped like the web's `max-h-[26.25rem]` instead of stretching
// the page by 81 rows, and the model columns scroll sideways while the time column stays put.
export function SeriesTable({ steps, series, stats, decimals, timeZone, locale, pairedRuns }: IProps) {
    const t = useTranslations('dashboard')

    const cellClass = pairedRuns ? PAIRED_CELL_CLASS : CELL_CLASS

    return (
        <ScrollView className="max-h-[26.25rem]" nestedScrollEnabled>
            <View className="flex-row">
                <View>
                    <View className={HEAD_ROW_CLASS}>
                        <Text className={cn(TIME_CLASS, 'font-semibold')}>{t('time')}</Text>
                    </View>
                    {steps.map((step) => (
                        <View key={step} className={ROW_CLASS}>
                            <Text className={TIME_CLASS}>{formatStepLabel(step, timeZone, locale)}</Text>
                        </View>
                    ))}
                </View>
                <ScrollView horizontal nestedScrollEnabled>
                    <View>
                        <View className={HEAD_ROW_CLASS}>
                            <Text className={cn(cellClass, 'font-semibold')}>{t('median')}</Text>
                            {series.map((s) => (
                                <Text key={s.modelId} className={cn(cellClass, 'font-semibold')} numberOfLines={2}>
                                    {MODEL_BY_ID[s.modelId].name}
                                </Text>
                            ))}
                        </View>
                        {steps.map((step, i) => (
                            <View key={step} className={ROW_CLASS}>
                                <Text className={cn(cellClass, 'font-semibold')}>
                                    {pairedRuns
                                        ? formatPairedMedian(pairedRuns, i, decimals)
                                        : formatNumber(stats.median[i], decimals)}
                                </Text>
                                {series.map((s) => (
                                    <Text key={s.modelId} className={cellClass}>
                                        {pairedRuns
                                            ? formatPairedModel(pairedRuns, s.modelId, i, decimals)
                                            : formatNumber(s.values[i], decimals)}
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
