import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

const styles = StyleSheet.create({
    background: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth },
})

// The web top bar's bottom border. Android's native header can only cast an elevation shadow, so the header draws
// over this background instead.
export function HeaderBackground() {
    const { colors } = useTheme()

    return <View style={[styles.background, { backgroundColor: colors.card, borderBottomColor: colors.border }]} />
}
