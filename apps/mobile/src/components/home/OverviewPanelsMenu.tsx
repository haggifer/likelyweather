import {
    DEFAULT_OVERVIEW_PANELS,
    getVisiblePanels,
    movePanel,
    movePanelTo,
    OverviewPanels,
    PanelVariable,
    togglePanel,
} from '@fa/shared/overview-panels'
import { Eye, EyeOff, GripVertical, SlidersHorizontal } from 'lucide-react-native'
import { useEffect } from 'react'
import { AccessibilityActionEvent, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { DARK } from '../../theme/tokens'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Text } from '../ui/text'
import { getDropIndex, moveItem } from './panel-drag'

type MoveAction = 'moveUp' | 'moveDown'

// Every row has this height, so the slot under a dragged row follows from its offset alone.
// The web's rows: 40 px controls 4 px apart.
const ROW_GAP = 4
const ROW_HEIGHT = 40 + ROW_GAP
const SETTLE_MS = 150
// The web's drag distance: a press on the eye that moves less stays a press.
const DRAG_DISTANCE = 4
const LIFTED_ELEVATION = 6
const LIFTED_SHADOW_OPACITY = 0.2
const STEPS: Record<MoveAction, -1 | 1> = { moveUp: -1, moveDown: 1 }
// A dragged row's shadow darkens in both themes, so it takes the dark theme's background rather than the current one.
const ROW_SHADOW = { shadowColor: DARK.background, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 }

interface RowProps {
    variable: PanelVariable
    // The order the rows are drawn in; a drag rewrites it as the finger moves, and the drop commits it.
    order: SharedValue<PanelVariable[]>
    index: number
    count: number
    isShown: boolean
    isToggleDisabled: boolean
    onToggle: (variable: PanelVariable) => void
    onMove: (variable: PanelVariable, step: -1 | 1) => void
    onDrop: (variable: PanelVariable, to: number) => void
}

const PanelRow = ({ variable, order, index, count, isShown, isToggleDisabled, onToggle, onMove, onDrop }: RowProps) => {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const { colors } = useTheme()

    const top = useSharedValue(index * ROW_HEIGHT)
    const startTop = useSharedValue(0)
    const isDragging = useSharedValue(false)

    const name = tv(variable)
    const maxTop = (count - 1) * ROW_HEIGHT
    // TalkBack cannot drag a row, so the handle moves the panel one place at a time instead.
    const actions = [
        ...(index > 0 ? [{ name: 'moveUp', label: t('moveUp', { name }) }] : []),
        ...(index < count - 1 ? [{ name: 'moveDown', label: t('moveDown', { name }) }] : []),
    ]
    const pan = Gesture.Pan()
        .withTestId(`drag-${variable}`)
        .activeOffsetY([-DRAG_DISTANCE, DRAG_DISTANCE])
        .onStart(() => {
            isDragging.set(true)
            startTop.set(top.get())
        })
        .onUpdate(({ translationY }) => {
            top.set(Math.min(Math.max(startTop.get() + translationY, 0), maxTop))

            const from = order.get().indexOf(variable)
            const to = getDropIndex(top.get(), ROW_HEIGHT, count)

            if (to !== from) order.set(moveItem(order.get(), from, to))
        })
        .onFinalize(() => {
            if (!isDragging.get()) return

            const to = order.get().indexOf(variable)

            isDragging.set(false)
            top.set(withTiming(to * ROW_HEIGHT, { duration: SETTLE_MS }))
            scheduleOnRN(onDrop, variable, to)
        })
    // Rows are placed by `top`, not a transform: rows stacked at one layout position would reach TalkBack in reverse.
    // The colours are JS values because the UI thread animates them.
    const lifted = useAnimatedStyle(() => ({
        top: top.get(),
        zIndex: isDragging.get() ? 1 : 0,
        elevation: isDragging.get() ? LIFTED_ELEVATION : 0,
        shadowOpacity: isDragging.get() ? LIFTED_SHADOW_OPACITY : 0,
        backgroundColor: isDragging.get() ? colors.muted : colors.popover,
    }))

    const handleAction = ({ nativeEvent }: AccessibilityActionEvent) =>
        onMove(variable, STEPS[nativeEvent.actionName as MoveAction])

    // The other rows slide aside as the dragged one passes them, and to their new places after Reset or a move.
    useAnimatedReaction(
        () => order.get().indexOf(variable),
        (slot, previous) => {
            if (slot !== previous && !isDragging.get()) {
                top.set(withTiming(slot * ROW_HEIGHT, { duration: SETTLE_MS }))
            }
        },
    )

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                className="absolute inset-x-0 h-10 flex-row items-center gap-1 rounded-md"
                style={[ROW_SHADOW, lifted]}
            >
                <View
                    className="size-10 items-center justify-center"
                    accessible
                    accessibilityLabel={t('dragPanel', { name })}
                    accessibilityActions={actions}
                    onAccessibilityAction={handleAction}
                >
                    <Icon as={GripVertical} className="size-4 text-muted-foreground" />
                </View>
                <Text className={cn('flex-1 text-sm', !isShown && 'text-muted-foreground')}>{name}</Text>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onPress={() => onToggle(variable)}
                    disabled={isToggleDisabled}
                    accessibilityLabel={t(isShown ? 'hidePanel' : 'showPanel', { name })}
                    className="size-10"
                >
                    <Icon
                        as={isShown ? Eye : EyeOff}
                        className={cn('size-4', isShown ? 'text-primary' : 'text-muted-foreground')}
                    />
                </Button>
            </Animated.View>
        </GestureDetector>
    )
}

interface IProps {
    // The overview's panels or the archive's, which keeps its own choice.
    panels: OverviewPanels
    onChange: (update: (panels: OverviewPanels) => OverviewPanels) => void
    // The overview's controls row is full on a phone, so the button keeps only its icon there.
    isLabelHiddenOnPhones?: boolean
    className?: string
}

export function OverviewPanelsMenu({ panels, onChange: setPanels, isLabelHiddenOnPhones = false, className }: IProps) {
    const t = useTranslations('overview')

    const order = useSharedValue(panels.order)

    const visibleCount = getVisiblePanels(panels).length
    const count = panels.order.length

    const handleToggle = (variable: PanelVariable) => setPanels((current) => togglePanel(current, variable))
    const handleMove = (variable: PanelVariable, step: -1 | 1) =>
        setPanels((current) => movePanel(current, variable, step))
    const handleDrop = (variable: PanelVariable, to: number) =>
        setPanels((current) => movePanelTo(current, variable, to))
    const handleReset = () => setPanels(() => DEFAULT_OVERVIEW_PANELS)

    // The rows are placed from the shared order on the UI thread; after a drop it already holds the new order, and a
    // change from elsewhere (Reset, a TalkBack move) moves the rows there.
    useEffect(() => {
        order.set(panels.order)
    }, [order, panels.order])

    return (
        <Popover>
            <PopoverTrigger asChild>
                {/* The web's `sm` button: a 36 px square with a 16 px icon in the overview's row, 40 px tall with a label. */}
                <Button
                    variant="outline"
                    size="sm"
                    accessibilityLabel={t('panels')}
                    className={cn(isLabelHiddenOnPhones ? 'size-9 px-0' : 'h-10', className)}
                >
                    <Icon as={SlidersHorizontal} className={isLabelHiddenOnPhones ? 'size-4' : undefined} />
                    {!isLabelHiddenOnPhones && <Text className="text-sm">{t('panels')}</Text>}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3" accessibilityLabel={t('customizeTitle')}>
                <Text role="heading" className="mb-2 text-sm font-semibold">
                    {t('customizeTitle')}
                </Text>
                {/* On iOS the popover draws in a window of its own, outside the app's gesture root. */}
                <GestureHandlerRootView style={{ height: count * ROW_HEIGHT - ROW_GAP }}>
                    {panels.order.map((variable, i) => {
                        const isShown = !panels.hidden.includes(variable)

                        return (
                            <PanelRow
                                key={variable}
                                variable={variable}
                                order={order}
                                index={i}
                                count={count}
                                isShown={isShown}
                                isToggleDisabled={isShown && visibleCount === 1}
                                onToggle={handleToggle}
                                onMove={handleMove}
                                onDrop={handleDrop}
                            />
                        )
                    })}
                </GestureHandlerRootView>
                <Button variant="outline" size="sm" onPress={handleReset} className="mt-3 w-full">
                    <Text className="text-sm">{t('resetPanels')}</Text>
                </Button>
            </PopoverContent>
        </Popover>
    )
}
