import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { ScrollView, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'

// The kit has no table: rows are views with the web table's bottom border, the time column 92 px and the others 64.
const ROW_CLASS = 'min-h-8 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = cn(ROW_CLASS, 'h-10')
const TIME_CLASS = 'w-[5.75rem] text-xs'
const CELL_CLASS = 'w-16 text-right text-xs'
// Inter's tabular figures also widen hyphens, so the model names in the head keep the proportional ones.
const VALUE_CLASS = cn(CELL_CLASS, 'tabular-nums')

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
}

// The chart's numbers: the rows scroll inside a frame capped like the web's `max-h-[26.25rem]` instead of stretching
// the page by 81 rows, and the model columns scroll sideways while the time column stays put.
export function SeriesTable({ steps, series, stats, decimals, timeZone, locale }: IProps) {
    const t = useTranslations('dashboard')

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
                            <Text className={cn(CELL_CLASS, 'font-semibold')}>{t('median')}</Text>
                            {series.map((s) => (
                                <Text key={s.modelId} className={cn(CELL_CLASS, 'font-semibold')} numberOfLines={2}>
                                    {MODEL_BY_ID[s.modelId].name}
                                </Text>
                            ))}
                        </View>
                        {steps.map((step, i) => (
                            <View key={step} className={ROW_CLASS}>
                                <Text className={cn(VALUE_CLASS, 'font-semibold')}>
                                    {formatNumber(stats.median[i], decimals)}
                                </Text>
                                {series.map((s) => (
                                    <Text key={s.modelId} className={VALUE_CLASS}>
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
