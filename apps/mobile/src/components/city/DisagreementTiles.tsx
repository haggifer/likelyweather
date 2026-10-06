import { formatSpread } from '@fa/chart-core/dashboard-stats'
import { DayDisagreement, DisagreementLabel } from '@fa/shared/ensemble'
import { formatDateKey, formatNumber } from '@fa/shared/format'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Card } from '../ui/Card'
import { ChipTone, StatusChip } from '../ui/StatusChip'

const TONES: Record<DisagreementLabel, ChipTone> = { agree: 'ok', mixed: 'warn', split: 'fail' }

const styles = StyleSheet.create({
    row: { gap: 8 },
    tile: { width: 112, borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
    day: { fontSize: 12 },
    spread: { fontSize: 18, fontWeight: '600' },
    unit: { fontSize: 12, fontWeight: '400' },
    empty: { fontSize: 14 },
})

interface IProps {
    days: DayDisagreement[]
    variable: Variable
}

// One tile per local day with the spread between the highest and the lowest model; the row scrolls sideways.
export function DisagreementTiles({ days, variable }: IProps) {
    const t = useTranslations('disagreement')
    const tv = useTranslations('variables')
    const locale = useLocale()
    const { colors } = useTheme()

    const { unit, decimals, disagreement } = VARIABLE_BY_ID[variable]
    const description = t(variable === Variable.Precip ? 'descriptionPrecip' : 'description', {
        variable: tv(variable).toLowerCase(),
        agree: formatNumber(disagreement.agree, 1),
        split: formatNumber(disagreement.split, 1),
        unit,
    })

    return (
        <Card title={t('title')} description={description}>
            {days.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {days.map((d) => (
                        <View key={d.day} style={[styles.tile, { borderColor: colors.border }]}>
                            <Text style={[styles.day, { color: colors['muted-foreground'] }]}>
                                {formatDateKey(d.day, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                            <Text
                                style={[styles.spread, { color: colors.foreground }]}
                                accessibilityHint={t('spreadTitle')}
                            >
                                {formatSpread(d.spread, decimals)}
                                <Text style={[styles.unit, { color: colors['muted-foreground'] }]}> {unit}</Text>
                            </Text>
                            <StatusChip tone={TONES[d.label]} label={t(d.label)} />
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>{t('empty')}</Text>
            )}
        </Card>
    )
}
