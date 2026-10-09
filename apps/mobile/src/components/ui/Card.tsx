import { ReactNode, useEffect, useState } from 'react'
import { Animated, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Text'

// The web's elevated cards (globals.css): a soft two-part shadow in light, a tight dark one in dark.
const LIGHT_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)'
const DARK_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.4)'
const DIMMED_OPACITY = 0.7
const FADE_MS = 150

const styles = StyleSheet.create({
    card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
    header: { gap: 4 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600' },
    description: { fontSize: 13, lineHeight: 18 },
})

interface IProps {
    title?: ReactNode
    titleStyle?: StyleProp<TextStyle>
    description?: string
    action?: ReactNode
    // Fades the card while it waits for newer data, as the web's opacity-70 with its transition.
    isDimmed?: boolean
    style?: StyleProp<ViewStyle>
    children?: ReactNode
}

export function Card({ title, titleStyle, description, action, isDimmed = false, style, children }: IProps) {
    const { colors, radius, isDark } = useTheme()
    const isReducedMotion = useReducedMotion()

    const [opacity] = useState(() => new Animated.Value(isDimmed ? DIMMED_OPACITY : 1))

    const hasHeader = Boolean(title || description || action)

    useEffect(() => {
        const target = isDimmed ? DIMMED_OPACITY : 1

        if (isReducedMotion) {
            opacity.setValue(target)
            return
        }

        Animated.timing(opacity, { toValue: target, duration: FADE_MS, useNativeDriver: true }).start()
    }, [isDimmed, isReducedMotion, opacity])

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius,
                    boxShadow: isDark ? DARK_SHADOW : LIGHT_SHADOW,
                    opacity,
                },
                style,
            ]}
        >
            {hasHeader && (
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerTitle}>
                            {typeof title === 'string' ? (
                                <Text
                                    style={[styles.title, { color: colors['card-foreground'] }, titleStyle]}
                                    accessibilityRole="header"
                                >
                                    {title}
                                </Text>
                            ) : (
                                title
                            )}
                        </View>
                        {action}
                    </View>
                    {description && (
                        <Text style={[styles.description, { color: colors['muted-foreground'] }]}>{description}</Text>
                    )}
                </View>
            )}
            {children}
        </Animated.View>
    )
}
