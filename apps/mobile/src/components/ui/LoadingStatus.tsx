import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Text'

const styles = StyleSheet.create({
    status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 14 },
})

interface IProps {
    label: string
}

// The web's role="status": TalkBack reads the text when it appears or changes, without moving focus to it.
export function LoadingStatus({ label }: IProps) {
    const { colors } = useTheme()

    return (
        <View style={styles.status} accessible accessibilityLiveRegion="polite" accessibilityLabel={label}>
            <ActivityIndicator size="small" color={colors['muted-foreground']} />
            <Text style={[styles.text, { color: colors['muted-foreground'] }]}>{label}</Text>
        </View>
    )
}
