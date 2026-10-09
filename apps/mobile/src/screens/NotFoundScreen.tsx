import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Button } from '../components/ui/Button'
import { Text } from '../components/ui/Text'
import { useTheme } from '../hooks/useTheme'

const styles = StyleSheet.create({
    screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    title: { fontSize: 24, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
    body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
})

// The web's not-found page, for a link into the app that names no screen.
export function NotFoundScreen() {
    const t = useTranslations('notFound')
    const router = useRouter()
    const { colors } = useTheme()

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
                {t('title')}
            </Text>
            <Text style={[styles.body, { color: colors['muted-foreground'] }]}>{t('body')}</Text>
            <Button label={t('home')} onPress={() => router.replace('/')} />
        </View>
    )
}
