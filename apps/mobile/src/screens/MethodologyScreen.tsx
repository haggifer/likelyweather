import { RAIN_THRESHOLD_MM } from '@fa/shared/constants'
import { MODELS } from '@fa/shared/models'
import { VARIABLES } from '@fa/shared/variables'
import { StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Card } from '../components/ui/Card'
import { LineSwatch } from '../components/ui/LineSwatch'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Text } from '../components/ui/Text'
import { useTheme } from '../hooks/useTheme'

const SECTIONS = ['sources', 'median', 'disagreement', 'limits'] as const
const METHODOLOGY_VALUES = { rain: RAIN_THRESHOLD_MM }

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    heading: { gap: 8 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.75 },
    cardTitle: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 14, lineHeight: 21 },
    small: { fontSize: 12, lineHeight: 17 },
    list: { gap: 4 },
    model: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    // Centres the swatch on the first line of a name that wraps.
    swatch: { marginTop: (21 - 6) / 2 },
    name: { fontWeight: '500' },
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
            <View style={styles.heading}>
                <Text style={[styles.title, text]} accessibilityRole="header">
                    {t('title')}
                </Text>
                <Text style={[styles.body, muted]}>{t('intro')}</Text>
            </View>
            {SECTIONS.map((section) => (
                <Card key={section} title={t(`${section}.title`)} titleStyle={styles.cardTitle}>
                    {t(`${section}.body`, METHODOLOGY_VALUES)
                        .split('\n')
                        .map((paragraph) => (
                            <Text key={paragraph} style={[styles.body, text]}>
                                {paragraph}
                            </Text>
                        ))}
                    {section === 'sources' && (
                        <View role="list" style={styles.list}>
                            {MODELS.map((m) => (
                                <View key={m.id} role="listitem" accessible style={styles.model}>
                                    <View style={styles.swatch}>
                                        <LineSwatch color={m.color} dash={m.dash} />
                                    </View>
                                    <Text style={[styles.body, text]}>
                                        <Text style={styles.name}>{m.name}</Text>{' '}
                                        <Text style={muted}>
                                            {m.provider}
                                            {m.isRegional ? ` · ${t('europeOnly')}` : ''}
                                        </Text>
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {section === 'disagreement' && (
                        <View role="list" style={styles.list}>
                            {VARIABLES.map((v) => (
                                <Text key={v.id} role="listitem" style={[styles.body, text]}>
                                    {t('thresholds', {
                                        variable: tv(v.id),
                                        agree: v.disagreement.agree,
                                        split: v.disagreement.split,
                                        unit: v.unit,
                                    })}
                                </Text>
                            ))}
                        </View>
                    )}
                </Card>
            ))}
            <Text style={[styles.small, muted]}>{t('attribution')}</Text>
        </ScreenScroll>
    )
}
