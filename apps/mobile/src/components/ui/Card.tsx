import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Text'

const styles = StyleSheet.create({
    card: { borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
    header: { gap: 4 },
    title: { fontSize: 16, fontWeight: '600' },
    description: { fontSize: 13, lineHeight: 18 },
})

interface IProps {
    title?: ReactNode
    description?: string
    action?: ReactNode
    style?: StyleProp<ViewStyle>
    children?: ReactNode
}

export function Card({ title, description, action, style, children }: IProps) {
    const { colors, radius } = useTheme()

    const hasHeader = Boolean(title || description || action)

    return (
        <View
            style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius },
                style,
            ]}
        >
            {hasHeader && (
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                            {typeof title === 'string' ? (
                                <Text style={[styles.title, { color: colors['card-foreground'] }]}>{title}</Text>
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
        </View>
    )
}
