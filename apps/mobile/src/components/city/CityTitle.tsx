import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/Text'

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48 },
    title: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    text: { flexShrink: 1, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
    name: { fontWeight: '700' },
    region: { fontWeight: '500' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})

interface IProps {
    name: string
    region: string
    countryCode: string | null
    // The star and the pencil, or their placeholders, at the right edge.
    children?: ReactNode
}

// The screen's heading: flag, name and region wrapping together, as the web's phone header.
export function CityTitle({ name, region, countryCode, children }: IProps) {
    const { colors } = useTheme()

    return (
        <View style={styles.row}>
            <View style={styles.title}>
                {countryCode && <FlagIcon countryCode={countryCode} width={24} />}
                <Text style={[styles.text, { color: colors.foreground }]} accessibilityRole="header">
                    <Text style={styles.name}>{name}</Text>
                    {region && <Text style={[styles.region, { color: colors['muted-foreground'] }]}>, {region}</Text>}
                </Text>
            </View>
            {children && <View style={styles.actions}>{children}</View>}
        </View>
    )
}
