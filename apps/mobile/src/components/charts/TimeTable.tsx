import { getStickyLabelOffset, getTimeTableDays, getTimeTableSlotLabels, TimeTableDay } from '@fa/chart-core/time-table'
import { LayoutChangeEvent, View } from 'react-native'
import Animated, {
    SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'
import { TimeTableRow } from './types'

// The kit has no table: rows are views with the web table's bottom border, head height and cell padding.
const ROW_CLASS = 'min-h-9 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = 'h-10 flex-row items-center border-b border-border'
const HEAD_TEXT_CLASS = 'text-sm font-semibold'
// The label column rides along the sideways scroll, so it stays put while the slots pass under it.
const PINNED_CLASS = 'z-1 w-32 self-stretch justify-center border-r border-border bg-muted px-2'
// A line on every column but the last, the web table's `border-r`.
const COLUMN_LINE_CLASS = 'border-r border-border'
// At the cell's start with the web's day-cell padding; `getStickyLabelOffset` slides it as the web's `sticky` does.
const DAY_LABEL_CLASS = 'absolute top-0 bottom-0 left-0 justify-center pr-2 pl-3'

interface DayCellProps {
    day: TimeTableDay
    columnClassName: string
    columnWidth: SharedValue<number>
    // The scroll offset, which is where the slots' visible part starts, in px from the first slot's left edge.
    scrollX: SharedValue<number>
    isLast: boolean
}

// The cell takes its width from one empty column per slot, so it lines up with the slots under it before any layout
// is measured.
const DayCell = ({ day: { start, count, label }, columnClassName, columnWidth, scrollX, isLast }: DayCellProps) => {
    const labelWidth = useSharedValue(0)

    const labelStyle = useAnimatedStyle(() => {
        const width = columnWidth.get()
        const span: [number, number] = [start * width, (start + count) * width]

        return { transform: [{ translateX: getStickyLabelOffset(span, labelWidth.get(), scrollX.get()) }] }
    })

    const handleLabelLayout = (event: LayoutChangeEvent) => labelWidth.set(event.nativeEvent.layout.width)

    return (
        <View className="flex-row self-stretch" accessible accessibilityLabel={label}>
            {Array.from({ length: count }, (_, i) => (
                <View key={i} className={columnClassName} />
            ))}
            {/* Laid over the cell, so the line adds nothing to its width, which must stay its slots' sum. */}
            {!isLast && <View className="absolute top-0 right-0 bottom-0 w-px bg-border" />}
            <Animated.View className={DAY_LABEL_CLASS} style={labelStyle} onLayout={handleLabelLayout}>
                <Text className={HEAD_TEXT_CLASS} numberOfLines={1}>
                    {label}
                </Text>
            </Animated.View>
        </View>
    )
}

interface CellProps {
    text: string
    className: string
    textClassName?: string
    onLayout?: (event: LayoutChangeEvent) => void
}

// A cell takes the row's full height, so its column line runs from edge to edge whatever the text's height.
const Cell = ({ text, className, textClassName, onLayout }: CellProps) => (
    <View className={cn('self-stretch justify-center px-2', className)} onLayout={onLayout}>
        <Text className={cn('text-center text-sm', textClassName)}>{text}</Text>
    </View>
)

interface IProps {
    steps: string[]
    timeZone: string
    locale: string
    rows: TimeTableRow[]
    // Every slot column's width, which keeps the cells under their heads.
    columnClassName: string
}

export function TimeTable({ steps, timeZone, locale, rows, columnClassName }: IProps) {
    const scrollX = useSharedValue(0)
    const columnWidth = useSharedValue(0)

    const days = getTimeTableDays(steps, timeZone, locale)
    const slotLabels = getTimeTableSlotLabels(steps, timeZone, locale)
    const pinned = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.get() }] }))
    const handleScroll = useAnimatedScrollHandler((event) => {
        scrollX.set(event.contentOffset.x)
    })
    // The column class is in rem; the date maths needs the px it comes to.
    const handleColumnLayout = (event: LayoutChangeEvent) => columnWidth.set(event.nativeEvent.layout.width)

    return (
        <Animated.ScrollView horizontal persistentScrollbar onScroll={handleScroll} scrollEventThrottle={16}>
            <View>
                <View className="flex-row bg-muted">
                    <Animated.View className={cn(PINNED_CLASS, 'border-b border-border')} style={pinned} />
                    <View>
                        <View className={HEAD_ROW_CLASS}>
                            {days.map((day, i) => (
                                <DayCell
                                    key={day.key}
                                    day={day}
                                    columnClassName={columnClassName}
                                    columnWidth={columnWidth}
                                    scrollX={scrollX}
                                    isLast={i === days.length - 1}
                                />
                            ))}
                        </View>
                        <View className={HEAD_ROW_CLASS}>
                            {slotLabels.map((slot, i) => (
                                <Cell
                                    key={steps[i]}
                                    text={slot}
                                    className={cn(columnClassName, i < steps.length - 1 && COLUMN_LINE_CLASS)}
                                    textClassName="font-semibold"
                                    onLayout={i === 0 ? handleColumnLayout : undefined}
                                />
                            ))}
                        </View>
                    </View>
                </View>
                {rows.map((row) => (
                    <View key={row.key} className={ROW_CLASS}>
                        <Animated.View className={PINNED_CLASS} style={pinned}>
                            <Text
                                className={cn('text-sm font-medium', row.isBold && 'font-semibold')}
                                numberOfLines={2}
                                accessibilityRole="header"
                            >
                                {row.label}
                            </Text>
                        </Animated.View>
                        {row.cells.map((cell, i) => (
                            <Cell
                                key={steps[i]}
                                text={cell}
                                className={cn(columnClassName, i < steps.length - 1 && COLUMN_LINE_CLASS)}
                                textClassName={row.isBold ? 'font-semibold' : undefined}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </Animated.ScrollView>
    )
}
