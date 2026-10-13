import {
    DEFAULT_OVERVIEW_PANELS,
    getVisiblePanels,
    movePanel,
    movePanelTo,
    OverviewPanels,
    PanelVariable,
    togglePanel,
} from '@fa/shared/overview-panels'
import { Eye, EyeOff, GripVertical } from 'lucide-react-native'
import { useEffect } from 'react'
import { AccessibilityActionEvent, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { withAlpha } from '../../theme/color-mix'
import { DARK } from '../../theme/tokens'
import { Button } from '../legacy-ui/Button'
import { Text } from '../legacy-ui/Text'
import { getDropIndex, moveItem } from './panel-drag'

type MoveAction = 'moveUp' | 'moveDown'

// Every row has this height, so the slot under a dragged row follows from its offset alone.
const ROW_HEIGHT = 48
const TARGET_SIZE = 44
const ICON_SIZE = 20
const SETTLE_MS = 150
const LIFTED_ELEVATION = 6
const LIFTED_SHADOW_OPACITY = 0.2
const DISABLED_OPACITY = 0.45
// A scrim darkens in both themes, so it takes the dark theme's background rather than the current one.
const SCRIM = withAlpha(DARK.background, 0.5)
const STEPS: Record<MoveAction, -1 | 1> = { moveUp: -1, moveDown: 1 }

const styles = StyleSheet.create({
    fill: { flex: 1, justifyContent: 'flex-end' },
    sheet: { paddingHorizontal: 16, paddingTop: 12, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    title: { flex: 1, fontSize: 16, fontWeight: '600' },
    row: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    handle: { width: TARGET_SIZE, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontSize: 14 },
    eye: { width: TARGET_SIZE, height: TARGET_SIZE, alignItems: 'center', justifyContent: 'center' },
})

interface RowProps {
    variable: PanelVariable
    // The order the rows are drawn in; a drag rewrites it as the finger moves, and the drop commits it.
    order: SharedValue<PanelVariable[]>
    index: number
    count: number
    isVisible: boolean
    isLastVisible: boolean
    onToggle: (variable: PanelVariable) => void
    onMove: (variable: PanelVariable, step: -1 | 1) => void
    onDrop: (variable: PanelVariable, to: number) => void
}

const PanelRow = ({ variable, order, index, count, isVisible, isLastVisible, onToggle, onMove, onDrop }: RowProps) => {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const { colors, radius } = useTheme()

    const top = useSharedValue(index * ROW_HEIGHT)
    const startTop = useSharedValue(0)
    const isDragging = useSharedValue(false)

    const name = tv(variable)
    const maxTop = (count - 1) * ROW_HEIGHT
    const EyeIcon = isVisible ? Eye : EyeOff
    // TalkBack cannot drag the handle, so it moves the panel one place at a time instead.
    const actions = [
        ...(index > 0 ? [{ name: 'moveUp', label: t('moveUp', { name }) }] : []),
        ...(index < count - 1 ? [{ name: 'moveDown', label: t('moveDown', { name }) }] : []),
    ]
    const pan = Gesture.Pan()
        .withTestId(`drag-${variable}`)
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
        <Animated.View style={[styles.row, { borderRadius: radius * 0.8, shadowColor: DARK.background }, lifted]}>
            <GestureDetector gesture={pan}>
                <View
                    style={styles.handle}
                    accessible
                    accessibilityLabel={t('dragPanel', { name })}
                    accessibilityActions={actions}
                    onAccessibilityAction={handleAction}
                >
                    <GripVertical size={ICON_SIZE} color={colors['muted-foreground']} />
                </View>
            </GestureDetector>
            <Text
                style={[styles.name, { color: isVisible ? colors['popover-foreground'] : colors['muted-foreground'] }]}
            >
                {name}
            </Text>
            <Pressable
                onPress={() => onToggle(variable)}
                disabled={isLastVisible}
                accessibilityRole="button"
                accessibilityLabel={t(isVisible ? 'hidePanel' : 'showPanel', { name })}
                accessibilityState={{ disabled: isLastVisible }}
                style={({ pressed }) => [
                    styles.eye,
                    isLastVisible && { opacity: DISABLED_OPACITY },
                    pressed && { opacity: 0.7 },
                ]}
            >
                <EyeIcon size={ICON_SIZE} color={isVisible ? colors.primary : colors['muted-foreground']} />
            </Pressable>
        </Animated.View>
    )
}

interface IProps {
    // The overview's panels or the archive's, which keeps its own choice.
    panels: OverviewPanels
    onChange: (update: (panels: OverviewPanels) => OverviewPanels) => void
    isOpen: boolean
    onClose: () => void
}

// Which of the overview's panels show and in which order; every change applies to the chart at once and is kept on
// the device.
export function OverviewPanelsSheet({ panels, onChange: setPanels, isOpen, onClose }: IProps) {
    const t = useTranslations('overview')
    const { colors, radius } = useTheme()
    const insets = useSafeAreaInsets()

    const order = useSharedValue(panels.order)

    const visible = getVisiblePanels(panels)
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

    // Gestures inside a Modal on Android need a root view of their own: the app's root is outside the modal's window.
    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="slide"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={[styles.fill, { backgroundColor: SCRIM }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
                <View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: insets.bottom + 12,
                            backgroundColor: colors.popover,
                            borderColor: colors.border,
                            borderTopLeftRadius: radius,
                            borderTopRightRadius: radius,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text
                            style={[styles.title, { color: colors['popover-foreground'] }]}
                            accessibilityRole="header"
                        >
                            {t('customizeTitle')}
                        </Text>
                        <Button label={t('resetPanels')} variant="outline" onPress={handleReset} />
                    </View>
                    <View style={{ height: count * ROW_HEIGHT }}>
                        {panels.order.map((variable, i) => (
                            <PanelRow
                                key={variable}
                                variable={variable}
                                order={order}
                                index={i}
                                count={count}
                                isVisible={visible.includes(variable)}
                                isLastVisible={visible.length === 1 && visible[0] === variable}
                                onToggle={handleToggle}
                                onMove={handleMove}
                                onDrop={handleDrop}
                            />
                        ))}
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    )
}
