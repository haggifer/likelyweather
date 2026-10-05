import { StyleSheet, Text, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../hooks/useTheme'

const SPACING = 16

const styles = StyleSheet.create({
    screen: { flex: 1, padding: SPACING, gap: SPACING / 2 },
    hero: { fontSize: 24, fontWeight: '700' },
    sub: { fontSize: 15 },
})

export function HomeScreen() {
    const t = useTranslations('landing')
    const { colors } = useTheme()

    return (
        <View style={styles.screen}>
            <Text style={[styles.hero, { color: colors.foreground }]}>{t('hero')}</Text>
            <Text style={[styles.sub, { color: colors['muted-foreground'] }]}>{t('sub')}</Text>
        </View>
    )
}
