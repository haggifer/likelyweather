import { RAIN_THRESHOLD_MM } from '@fa/shared/constants'
import { MODELS } from '@fa/shared/models'
import { VARIABLES } from '@fa/shared/variables'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Card } from '../components/ui/Card'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { useTheme } from '../hooks/useTheme'

const SECTIONS = ['sources', 'median', 'disagreement', 'limits'] as const
const METHODOLOGY_VALUES = { rain: RAIN_THRESHOLD_MM }

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    title: { fontSize: 26, fontWeight: '700' },
    body: { fontSize: 14, lineHeight: 21 },
    small: { fontSize: 12, lineHeight: 17 },
    model: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    swatch: { width: 16, height: 3, borderRadius: 2 },
})

// The web's methodology page, from the same catalog entries.
export function MethodologyScreen() {
    const t = useTranslations('methodology')
    const tv = useTranslations('variables')
    const { colors } = useTheme()

    const text = { color: colors.foreground }
    const muted = { color: colors['muted-foreground'] }

    return (
        <ScreenScroll contentContainerStyle={styles.content} style={{ backgroundColor: colors.background }}>
            <Text style={[styles.title, text]} accessibilityRole="header">
                {t('title')}
            </Text>
            <Text style={[styles.body, muted]}>{t('intro')}</Text>
            {SECTIONS.map((section) => (
                <Card key={section} title={t(`${section}.title`)}>
                    {t(`${section}.body`, METHODOLOGY_VALUES)
                        .split('\n')
                        .map((paragraph) => (
                            <Text key={paragraph} style={[styles.body, text]}>
                                {paragraph}
                            </Text>
                        ))}
                    {section === 'sources' &&
                        MODELS.map((m) => (
                            <View key={m.id} style={styles.model}>
                                <View style={[styles.swatch, { backgroundColor: m.color }]} />
                                <Text style={[styles.body, text]}>
                                    {m.name}{' '}
                                    <Text style={muted}>
                                        {m.provider}
                                        {m.isRegional ? ` · ${t('europeOnly')}` : ''}
                                    </Text>
                                </Text>
                            </View>
                        ))}
                    {section === 'disagreement' &&
                        VARIABLES.map((v) => (
                            <Text key={v.id} style={[styles.body, text]}>
                                {t('thresholds', {
                                    variable: tv(v.id),
                                    agree: v.disagreement.agree,
                                    split: v.disagreement.split,
                                    unit: v.unit,
                                })}
                            </Text>
                        ))}
                </Card>
            ))}
            <Text style={[styles.small, muted]}>{t('attribution')}</Text>
        </ScreenScroll>
    )
}
