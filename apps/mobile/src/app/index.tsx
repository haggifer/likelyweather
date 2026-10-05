import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'

const SPACING = 16

const styles = StyleSheet.create({
    screen: { flex: 1, padding: SPACING },
    title: { fontSize: 24, fontWeight: '700' },
})

export default function HomeScreen() {
    const { colors } = useTheme()

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Forecast Arena</Text>
        </View>
    )
}
