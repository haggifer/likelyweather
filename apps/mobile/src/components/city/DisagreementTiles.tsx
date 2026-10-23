import { formatSpread } from '@fa/shared/dashboard'
import { DayDisagreement } from '@fa/shared/ensemble'
import { formatDayTileLines, formatNumber } from '@fa/shared/format'
import { DISAGREEMENT_TONE } from '@fa/shared/status-tone'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ScrollView, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Text } from '../ui/text'

// A tile's `min-w-[5.3125rem]` (the web's minimum, 85 px) and the row's `gap-2`, which the row snaps by.
const TILE_WIDTH = 85
const TILE_GAP = 8

interface IProps {
    days: DayDisagreement[]
    variable: Variable
    className?: string
}

// One tile per local day with the spread between the highest and the lowest model; the row scrolls sideways and
// snaps to a tile's start, like the web's phone row, and is named for TalkBack like the web's region.
export function DisagreementTiles({ days, variable, className }: IProps) {
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
        <Card className={cn('gap-3 py-4', className)}>
            <CardHeader className="gap-1 px-4">
                <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {days.length ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={TILE_WIDTH + TILE_GAP}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        // The tiles share the row when few days are left, as the web's do.
                        contentContainerClassName="grow gap-2 pb-1"
                        accessibilityLabel={t('title')}
                    >
                        {days.map((d) => (
                            <View
                                key={d.day}
                                className="min-w-[5.3125rem] flex-1 items-center gap-1.5 rounded-md border border-border p-2"
                            >
                                <View>
                                    {formatDayTileLines(d.day, locale).map((line) => (
                                        <Text
                                            key={line}
                                            className="text-center text-sm leading-tight text-muted-foreground"
                                        >
                                            {line}
                                        </Text>
                                    ))}
                                </View>
                                <Text
                                    className="text-lg leading-none font-semibold"
                                    accessibilityHint={t('spreadTitle')}
                                >
                                    {formatSpread(d.spread, decimals)}
                                    <Text className="text-xs font-normal text-muted-foreground"> {unit}</Text>
                                </Text>
                                <Badge variant={DISAGREEMENT_TONE[d.label]} className="w-full self-stretch">
                                    <Text className="text-[0.8125rem]">{t(d.label)}</Text>
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
