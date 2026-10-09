import { getErrorKind } from '@fa/api-client/error-kind'
import { RefreshCw } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Button } from './Button'
import { Text } from './Text'

const styles = StyleSheet.create({
    notice: { alignItems: 'center', gap: 12, paddingVertical: 24 },
    text: { fontSize: 14, textAlign: 'center' },
})

interface IProps {
    error: unknown
    onRetry?: () => void
}

export function ErrorNotice({ error, onRetry }: IProps) {
    const t = useTranslations('errors')
    const { colors } = useTheme()

    return (
        <View style={styles.notice} accessibilityRole="alert">
            <Text style={[styles.text, { color: colors['muted-foreground'] }]}>{t(getErrorKind(error))}</Text>
            {onRetry && <Button variant="outline" icon={RefreshCw} label={t('retry')} onPress={onRetry} />}
        </View>
    )
}
