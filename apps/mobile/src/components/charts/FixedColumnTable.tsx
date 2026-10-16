import { ScrollView, View } from 'react-native'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'

export interface TableColumn {
    key: string
    label: string
    isBold?: boolean
}

// The kit has no table: rows are views with the web table's bottom border and cell padding. The time column stays put
// on the muted background (author, 2026-10-16) while the others scroll sideways.
const ROW_CLASS = 'min-h-9 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = cn(ROW_CLASS, 'h-11')
const TIME_CLASS = 'w-28 px-2 text-sm'

interface IProps {
    timeLabel: string
    // One label per row, the slot's local time.
    rowLabels: string[]
    columns: TableColumn[]
    getCell: (rowIndex: number, column: TableColumn) => string
    // Every column's width, which keeps the cells under their heads.
    cellClassName: string
}

// A chart's numbers: the rows scroll inside a frame capped like the web's `max-h-[26.25rem]` instead of stretching the
// page by 81 rows.
export function FixedColumnTable({ timeLabel, rowLabels, columns, getCell, cellClassName }: IProps) {
    const cellClass = cn('text-right text-sm', cellClassName)

    return (
        <ScrollView className="max-h-[26.25rem]" nestedScrollEnabled>
            <View className="flex-row">
                <View className="bg-muted">
                    <View className={HEAD_ROW_CLASS}>
                        <Text className={cn(TIME_CLASS, 'font-semibold')}>{timeLabel}</Text>
                    </View>
                    {rowLabels.map((label, i) => (
                        <View key={i} className={ROW_CLASS}>
                            <Text className={TIME_CLASS}>{label}</Text>
                        </View>
                    ))}
                </View>
                <ScrollView horizontal nestedScrollEnabled>
                    <View>
                        <View className={HEAD_ROW_CLASS}>
                            {columns.map((column) => (
                                <Text key={column.key} className={cn(cellClass, 'font-semibold')} numberOfLines={2}>
                                    {column.label}
                                </Text>
                            ))}
                        </View>
                        {rowLabels.map((_, i) => (
                            <View key={i} className={ROW_CLASS}>
                                {columns.map((column) => (
                                    <Text key={column.key} className={cn(cellClass, column.isBold && 'font-semibold')}>
                                        {getCell(i, column)}
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
