import { CloudSun } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../ui/Text'

const BRAND = 'Forecast Arena'

const styles = StyleSheet.create({
    mark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    word: { fontSize: 15, lineHeight: 16, fontWeight: '700', letterSpacing: -0.2 },
})

// The web top bar's brand: the cloud-sun logo and the name on two lines.
export function Wordmark() {
    const { colors } = useTheme()

    return (
        <View style={styles.mark} accessible accessibilityRole="header" accessibilityLabel={BRAND}>
            <CloudSun size={32} strokeWidth={1.75} color={colors.primary} />
            <View>
                <Text style={[styles.word, { color: colors.foreground }]}>Forecast</Text>
                <Text style={[styles.word, { color: colors.foreground }]}>Arena</Text>
            </View>
        </View>
    )
}
