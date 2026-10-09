import { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Text'

type Variant = 'default' | 'outline' | 'ghost'

const styles = StyleSheet.create({
    button: {
        minHeight: 40,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
    },
    icon: { minHeight: 40, minWidth: 40, paddingHorizontal: 0 },
    label: { fontSize: 14, fontWeight: '500' },
})

interface IProps {
    label?: string
    icon?: LucideIcon
    variant?: Variant
    onPress?: () => void
    isDisabled?: boolean
    isBusy?: boolean
    accessibilityLabel?: string
    isSelected?: boolean
    style?: StyleProp<ViewStyle>
}

export function Button({
    label,
    icon: Icon,
    variant = 'default',
    onPress,
    isDisabled = false,
    isBusy = false,
    accessibilityLabel,
    isSelected,
    style,
}: IProps) {
    const { colors, radius } = useTheme()

    const isFilled = variant === 'default'
    const foreground = isFilled ? colors['primary-foreground'] : colors.foreground
    const background = isFilled ? colors.primary : variant === 'outline' ? colors.card : 'transparent'
    const border = variant === 'outline' ? colors.border : 'transparent'

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled || isBusy}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
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
                Icon && <Icon size={18} color={foreground} />
            )}
            {label && <Text style={[styles.label, { color: foreground }]}>{label}</Text>}
        </Pressable>
    )
}
