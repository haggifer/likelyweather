import { formatSpread } from '@fa/shared/dashboard'
import { DayDisagreement } from '@fa/shared/ensemble'
import { formatDateKey, formatNumber } from '@fa/shared/format'
import { DISAGREEMENT_TONE } from '@fa/shared/status-tone'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScrollView, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Text } from '../ui/text'

// A tile's `w-28` and the row's `gap-2`, which the row snaps by.
const TILE_WIDTH = 112
const TILE_GAP = 8

interface IProps {
    days: DayDisagreement[]
    variable: Variable
}

// One tile per local day with the spread between the highest and the lowest model; the row scrolls sideways and
// snaps to a tile's start, like the web's phone row, and is named for TalkBack like the web's region.
export function DisagreementTiles({ days, variable }: IProps) {
    const t = useTranslations('disagreement')
    const tInline = useTranslations('variablesInline')
    const locale = useLocale()

    const { unit, decimals, disagreement } = VARIABLE_BY_ID[variable]
    const description = t(variable === Variable.Precip ? 'descriptionPrecip' : 'description', {
        variable: tInline(variable),
        agree: formatNumber(disagreement.agree, 1),
        split: formatNumber(disagreement.split, 1),
        unit,
    })

    return (
        <Card className="gap-3 py-4">
            <CardHeader className="gap-1 px-4">
                <CardTitle className="text-sm">{t('title')}</CardTitle>
                <CardDescription className="text-[0.8125rem]">{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {days.length ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={TILE_WIDTH + TILE_GAP}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        contentContainerClassName="gap-2"
                        accessibilityLabel={t('title')}
                    >
                        {days.map((d) => (
                            <View key={d.day} className="w-28 gap-1.5 rounded-md border border-border p-2.5">
                                <Text className="text-xs text-muted-foreground">
                                    {formatDateKey(d.day, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                                </Text>
                                <Text
                                    className="text-lg font-semibold tabular-nums"
                                    accessibilityHint={t('spreadTitle')}
                                >
                                    {formatSpread(d.spread, decimals)}
                                    <Text className="text-xs font-normal text-muted-foreground"> {unit}</Text>
                                </Text>
                                <Badge variant={DISAGREEMENT_TONE[d.label]} className="self-start">
                                    <Text>{t(d.label)}</Text>
                                </Badge>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <Text className="text-sm text-muted-foreground">{t('empty')}</Text>
                )}
            </CardContent>
        </Card>
    )
}
