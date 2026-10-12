import {
    DEFAULT_OVERVIEW_PANELS,
    getVisiblePanels,
    movePanel,
    PanelVariable,
    togglePanel,
} from '@fa/shared/overview-panels'
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslations } from 'use-intl'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { useTheme } from '../../hooks/useTheme'
import { withAlpha } from '../../theme/color-mix'
import { DARK } from '../../theme/tokens'
import { Button } from '../ui/Button'
import { Text } from '../ui/Text'

const BOX_SIZE = 20
const DISABLED_OPACITY = 0.45
// A scrim darkens in both themes, so it takes the dark theme's background rather than the current one.
const SCRIM = withAlpha(DARK.background, 0.5)

const styles = StyleSheet.create({
    fill: { flex: 1, justifyContent: 'flex-end' },
    sheet: { paddingHorizontal: 16, paddingTop: 12, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    title: { flex: 1, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
    toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
    box: { width: BOX_SIZE, height: BOX_SIZE, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontSize: 14 },
})

interface RowProps {
    variable: PanelVariable
    isVisible: boolean
    isLastVisible: boolean
    isFirst: boolean
    isLast: boolean
    onToggle: (variable: PanelVariable) => void
    onMove: (variable: PanelVariable, step: -1 | 1) => void
}

const PanelRow = ({ variable, isVisible, isLastVisible, isFirst, isLast, onToggle, onMove }: RowProps) => {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const { colors, radius } = useTheme()

    const name = tv(variable)

    return (
        <View style={styles.row}>
            <Pressable
                onPress={() => onToggle(variable)}
                disabled={isLastVisible}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isVisible, disabled: isLastVisible }}
                style={({ pressed }) => [
                    styles.toggle,
                    isLastVisible && { opacity: DISABLED_OPACITY },
                    pressed && { opacity: 0.7 },
                ]}
            >
                <View
                    style={[
                        styles.box,
                        {
                            borderRadius: radius * 0.4,
                            borderColor: isVisible ? colors.primary : colors['muted-foreground'],
                            backgroundColor: isVisible ? colors.primary : 'transparent',
                        },
                    ]}
                >
                    {isVisible && <Check size={14} strokeWidth={3} color={colors['primary-foreground']} />}
                </View>
                <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
            </Pressable>
            <Button
                icon={ChevronUp}
                variant="ghost"
                onPress={() => onMove(variable, -1)}
                isDisabled={isFirst}
                accessibilityLabel={t('moveUp', { name })}
            />
            <Button
                icon={ChevronDown}
                variant="ghost"
                onPress={() => onMove(variable, 1)}
                isDisabled={isLast}
                accessibilityLabel={t('moveDown', { name })}
            />
        </View>
    )
}

interface IProps {
    isOpen: boolean
    onClose: () => void
}

// Which of the overview's panels show and in which order; every change applies to the chart at once and is kept on
// the device.
export function OverviewPanelsSheet({ isOpen, onClose }: IProps) {
    const t = useTranslations('overview')
    const { colors, radius } = useTheme()
    const insets = useSafeAreaInsets()
    const { panels, setPanels } = useOverviewPanels()

    const visible = getVisiblePanels(panels)

    const handleToggle = (variable: PanelVariable) => setPanels((current) => togglePanel(current, variable))
    const handleMove = (variable: PanelVariable, step: -1 | 1) =>
        setPanels((current) => movePanel(current, variable, step))
    const handleReset = () => setPanels(() => DEFAULT_OVERVIEW_PANELS)

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="slide"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}
        >
            <View style={[styles.fill, { backgroundColor: SCRIM }]}>
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
                    {panels.order.map((variable, i) => (
                        <PanelRow
                            key={variable}
                            variable={variable}
                            isVisible={visible.includes(variable)}
                            isLastVisible={visible.length === 1 && visible[0] === variable}
                            isFirst={i === 0}
                            isLast={i === panels.order.length - 1}
                            onToggle={handleToggle}
                            onMove={handleMove}
                        />
                    ))}
                </View>
            </View>
        </Modal>
    )
}
