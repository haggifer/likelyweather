import { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Text'

type Variant = 'default' | 'outline' | 'ghost'

// The web's buttons on a coarse pointer (`pointer-coarse:size-9`).
const HEIGHT = 36
const ICON_SIZE = 16

const styles = StyleSheet.create({
    button: {
        minHeight: HEIGHT,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
    },
    icon: { minWidth: HEIGHT, paddingHorizontal: 0 },
    label: { fontSize: 14, fontWeight: '500' },
})

interface IProps {
    label?: string
    icon?: LucideIcon
    // Drawn after the label, like the web's "Open details →".
    endIcon?: LucideIcon
    variant?: Variant
    onPress?: () => void
    isDisabled?: boolean
    // A disabled button still takes this tap, to say why it is disabled: a phone has no hover to show a tooltip.
    onDisabledPress?: () => void
    isBusy?: boolean
    accessibilityLabel?: string
    accessibilityHint?: string
    isSelected?: boolean
    style?: StyleProp<ViewStyle>
}

export function Button({
    label,
    icon: Icon,
    endIcon: EndIcon,
    variant = 'default',
    onPress,
    isDisabled = false,
    onDisabledPress,
    isBusy = false,
    accessibilityLabel,
    accessibilityHint,
    isSelected,
    style,
}: IProps) {
    const { colors, radius } = useTheme()

    const isFilled = variant === 'default'
    const foreground = isFilled ? colors['primary-foreground'] : colors.foreground
    const background = isFilled ? colors.primary : variant === 'outline' ? colors.card : 'transparent'
    const border = variant === 'outline' ? colors.border : 'transparent'
    const isPressable = !isBusy && (!isDisabled || Boolean(onDisabledPress))

    return (
        <Pressable
            onPress={isDisabled ? onDisabledPress : onPress}
            // Pressable writes `disabled` into the accessibility state, which must keep saying disabled here.
            disabled={isPressable ? undefined : true}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled, busy: isBusy, selected: isSelected }}
            style={({ pressed }) => [
                styles.button,
                !label && styles.icon,
                { backgroundColor: background, borderColor: border, borderRadius: radius * 0.8 },
                (isDisabled || pressed) && { opacity: isDisabled ? 0.45 : 0.7 },
                style,
            ]}
        >
            {isBusy ? (
                <ActivityIndicator size="small" color={foreground} />
            ) : (
                Icon && <Icon size={ICON_SIZE} color={foreground} />
            )}
            {label && <Text style={[styles.label, { color: foreground }]}>{label}</Text>}
            {EndIcon && <EndIcon size={ICON_SIZE} color={foreground} />}
        </Pressable>
    )
}
