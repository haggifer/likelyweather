import { getLabelWidth } from '@fa/chart-core/day-labels'
import { getTimeTableDays, getTimeTableSlotLabels, placeDayLabel, TimeTableDay } from '@fa/chart-core/time-table'
import { LayoutChangeEvent, View } from 'react-native'
import Animated, {
    SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
} from 'react-native-reanimated'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'
import { TimeTableRow } from './types'

// `text-sm`, which the date labels' estimated widths are worked out for.
const DAY_LABEL_FONT_SIZE = 14

// The kit has no table: rows are views with the web table's bottom border, head height and cell padding.
const ROW_CLASS = 'min-h-9 flex-row items-center border-b border-border'
const HEAD_ROW_CLASS = 'h-10 flex-row items-center border-b border-border'
const HEAD_TEXT_CLASS = 'text-sm font-semibold'
// The label column rides along the sideways scroll, so it stays put while the slots pass under it.
const PINNED_CLASS = 'z-1 w-32 self-stretch justify-center border-r border-border bg-muted px-2'
// A line on every column but the last, the web table's `border-r`.
const COLUMN_LINE_CLASS = 'border-r border-border'
const DAY_LABEL_CLASS = 'absolute inset-0 items-center justify-center'

interface DayCellProps {
    day: TimeTableDay
    columnClassName: string
    columnWidth: SharedValue<number>
    visibleRange: SharedValue<[number, number]>
    isLast: boolean
}

// The cell takes its width from one empty column per slot, so it lines up with the slots under it before any
// layout is measured. Both forms of the date sit centred in the cell and slide, on the UI thread, to the centre of
// the cell's visible part.
const DayCell = ({ day, columnClassName, columnWidth, visibleRange, isLast }: DayCellProps) => {
    const { start, count, label, shortLabel } = day
    const fullWidth = getLabelWidth(label, DAY_LABEL_FONT_SIZE)
    const shortWidth = getLabelWidth(shortLabel, DAY_LABEL_FONT_SIZE)

    const placement = useDerivedValue(() => {
        const width = columnWidth.get()
        const span: [number, number] = [start * width, (start + count) * width]

        return {
            ...placeDayLabel(span, visibleRange.get(), fullWidth, shortWidth),
            offset: (start + count / 2) * width,
        }
    })
    const fullStyle = useAnimatedStyle(() => ({
        opacity: placement.get().form === 'full' ? 1 : 0,
        transform: [{ translateX: placement.get().center - placement.get().offset }],
    }))
    const shortStyle = useAnimatedStyle(() => ({
        opacity: placement.get().form === 'short' ? 1 : 0,
        transform: [{ translateX: placement.get().center - placement.get().offset }],
    }))

    return (
        <View className="flex-row self-stretch" accessible accessibilityLabel={label}>
            {Array.from({ length: count }, (_, i) => (
                <View key={i} className={columnClassName} />
            ))}
            {/* Laid over the cell, so the line adds nothing to its width, which must stay its slots' sum. */}
            {!isLast && <View className="absolute top-0 right-0 bottom-0 w-px bg-border" />}
            <Animated.View className={DAY_LABEL_CLASS} style={fullStyle}>
                <Text className={HEAD_TEXT_CLASS} numberOfLines={1}>
                    {label}
                </Text>
            </Animated.View>
            <Animated.View className={DAY_LABEL_CLASS} style={shortStyle}>
                <Text className={HEAD_TEXT_CLASS} numberOfLines={1}>
                    {shortLabel}
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
        <Text className={cn('text-right text-sm', textClassName)}>{text}</Text>
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
    const viewportWidth = useSharedValue(0)
    const pinnedWidth = useSharedValue(0)
    const columnWidth = useSharedValue(0)

    const days = getTimeTableDays(steps, timeZone, locale)
    const slotLabels = getTimeTableSlotLabels(steps, timeZone, locale)
    const pinned = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.get() }] }))
    // The slots on screen, in px from the first slot's left edge.
    const visibleRange = useDerivedValue((): [number, number] => [
        scrollX.get(),
        scrollX.get() + viewportWidth.get() - pinnedWidth.get(),
    ])

    const handleScroll = useAnimatedScrollHandler((event) => {
        scrollX.set(event.contentOffset.x)
    })
    const handleViewportLayout = (event: LayoutChangeEvent) => viewportWidth.set(event.nativeEvent.layout.width)
    const handlePinnedLayout = (event: LayoutChangeEvent) => pinnedWidth.set(event.nativeEvent.layout.width)
    // The column class is in rem; the date maths needs the px it comes to.
    const handleColumnLayout = (event: LayoutChangeEvent) => columnWidth.set(event.nativeEvent.layout.width)

    return (
        <Animated.ScrollView
            horizontal
            persistentScrollbar
            onScroll={handleScroll}
            onLayout={handleViewportLayout}
            scrollEventThrottle={16}
        >
            <View>
                <View className="flex-row bg-muted">
                    <Animated.View
                        className={cn(PINNED_CLASS, 'border-b border-border')}
                        style={pinned}
                        onLayout={handlePinnedLayout}
                    />
                    <View>
                        <View className={HEAD_ROW_CLASS}>
                            {days.map((day, i) => (
                                <DayCell
                                    key={day.key}
                                    day={day}
                                    columnClassName={columnClassName}
                                    columnWidth={columnWidth}
                                    visibleRange={visibleRange}
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
