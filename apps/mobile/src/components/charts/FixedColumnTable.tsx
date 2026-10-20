import { ScrollView, View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'

export interface TableColumn {
    key: string
    label: string
    isBold?: boolean
}

// The kit has no table: rows are views with the web table's bottom border and cell padding. The header row stays at the
// top and the time column at the left, both on the muted background (author, 2026-10-16 and 2026-10-20).
const ROW_CLASS = 'min-h-9 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = cn(ROW_CLASS, 'h-11 bg-muted')
const TIME_CLASS = 'w-28 px-2 text-sm'
// The time cells ride along the sideways scroll, so they stay put while the other columns pass under them.
const PINNED_CLASS = 'z-1 self-stretch justify-center bg-muted'
// With the header outside the rows' scroller, the frame keeps the web's `max-h-[26.25rem]`: a 2.75rem header and the
// rest for the rows.
const ROWS_CLASS = 'max-h-[23.5rem]'

interface IProps {
    timeLabel: string
    // One label per row, the slot's local time.
    rowLabels: string[]
    columns: TableColumn[]
    getCell: (rowIndex: number, column: TableColumn) => string
    // Every column's width, which keeps the cells under their heads.
    cellClassName: string
}

// A chart's numbers in a capped frame rather than a page stretched by 81 rows. The rows scroll inside the sideways
// scroller, so its scrollbar sits at the frame's bottom edge, and it stays drawn (author, 2026-10-20).
export function FixedColumnTable({ timeLabel, rowLabels, columns, getCell, cellClassName }: IProps) {
    const scrollX = useSharedValue(0)

    const cellClass = cn('text-right text-sm', cellClassName)
    const pinned = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.get() }] }))

    const handleScroll = useAnimatedScrollHandler((event) => {
        scrollX.set(event.contentOffset.x)
    })

    return (
        <Animated.ScrollView
            horizontal
            persistentScrollbar
            nestedScrollEnabled
            onScroll={handleScroll}
            scrollEventThrottle={16}
        >
            <View>
                <View className={HEAD_ROW_CLASS}>
                    <Animated.View className={PINNED_CLASS} style={pinned}>
                        <Text className={cn(TIME_CLASS, 'font-semibold')}>{timeLabel}</Text>
                    </Animated.View>
                    {columns.map((column) => (
                        <Text key={column.key} className={cn(cellClass, 'font-semibold')} numberOfLines={2}>
                            {column.label}
                        </Text>
                    ))}
                </View>
                <ScrollView className={ROWS_CLASS} nestedScrollEnabled>
                    {rowLabels.map((label, i) => (
                        <View key={i} className={ROW_CLASS}>
                            <Animated.View className={PINNED_CLASS} style={pinned}>
                                <Text className={TIME_CLASS}>{label}</Text>
                            </Animated.View>
                            {columns.map((column) => (
                                <Text key={column.key} className={cn(cellClass, column.isBold && 'font-semibold')}>
                                    {getCell(i, column)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Animated.ScrollView>
    )
}
