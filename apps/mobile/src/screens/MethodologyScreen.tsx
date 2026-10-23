import { METHODOLOGY_SECTIONS, METHODOLOGY_VALUES, toParagraphs } from '@fa/shared/methodology'
import { MODELS } from '@fa/shared/models'
import { DISAGREEMENT_VARIABLES } from '@fa/shared/variables'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LineSwatch } from '../components/ui/LineSwatch'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Text } from '../components/ui/text'

const BODY = 'text-sm leading-relaxed'
const SMALL_MUTED = 'text-xs text-muted-foreground'

// The web's methodology page, from the same catalog entries and shared sections.
export function MethodologyScreen() {
    const t = useTranslations('methodology')
    const tv = useTranslations('variables')

    return (
        <ScreenScroll className="bg-background" contentContainerClassName="gap-4 p-4">
            <View className="gap-2">
                <Text role="heading" className="text-3xl font-bold tracking-tight">
                    {t('title')}
                </Text>
                <Text className="text-base text-muted-foreground">{t('intro')}</Text>
            </View>
            {METHODOLOGY_SECTIONS.map((section) => (
                <Card key={section} className="gap-2 py-4">
                    <CardHeader className="px-4">
                        <CardTitle className="text-lg leading-snug font-semibold">{t(`${section}.title`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="gap-2 px-4">
                        {toParagraphs(t(`${section}.body`, METHODOLOGY_VALUES)).map((paragraph) => (
                            <Text key={paragraph} className={BODY}>
                                {paragraph}
                            </Text>
                        ))}
                        {section === 'sources' && (
                            <View role="list" className="mt-1 gap-1">
                                {MODELS.map((m) => (
                                    <View key={m.id} role="listitem" accessible className="flex-row items-start gap-2">
                                        {/* Centres the swatch on the first line of a name that wraps. */}
                                        <View className="mt-2">
                                            <LineSwatch color={m.color} dash={m.dash} />
                                        </View>
                                        <Text className={`${BODY} flex-1`}>
                                            <Text className={`${BODY} font-medium`}>{m.name}</Text>{' '}
                                            <Text className={`${BODY} text-muted-foreground`}>
                                                {m.provider}
                                                {m.isRegional ? ` · ${t('europeOnly')}` : ''}
                                            </Text>
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        {section === 'disagreement' && (
                            <View role="list" className="mt-1 gap-1">
                                {DISAGREEMENT_VARIABLES.map((v) => (
                                    <Text key={v.id} role="listitem" className={BODY}>
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
                    </CardContent>
                </Card>
            ))}
            <Text className={SMALL_MUTED}>{t('attribution')}</Text>
        </ScreenScroll>
    )
}
