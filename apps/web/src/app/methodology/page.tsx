import { LineSwatch } from '@/components/shell/LineSwatch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { METHODOLOGY_SECTIONS, METHODOLOGY_VALUES, toParagraphs } from '@fa/shared/methodology'
import { MODELS } from '@fa/shared/models'
import { VARIABLES } from '@fa/shared/variables'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const tNav = await getTranslations('nav')

    return { title: tNav('methodology') }
}

export default async function MethodologyPage() {
    const t = await getTranslations('methodology')
    const tv = await getTranslations('variables')

    return (
        <article className="mx-auto flex max-w-3xl flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="mt-2 text-muted-foreground">{t('intro')}</p>
            </div>
            {METHODOLOGY_SECTIONS.map((section) => (
                <Card key={section} className="gap-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">{t(`${section}.title`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm leading-relaxed">
                        {toParagraphs(t(`${section}.body`, METHODOLOGY_VALUES)).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section === 'sources' && (
                            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                                {MODELS.map((m) => (
                                    <li key={m.id} className="flex items-start gap-2">
                                        <span className="mt-2 flex w-[1.125rem] shrink-0">
                                            <LineSwatch color={m.color} dash={m.dash} />
                                        </span>
                                        <span>
                                            <span className="font-medium">{m.name}</span>{' '}
                                            <span className="text-muted-foreground">
                                                {m.provider}
                                                {m.isRegional ? ` · ${t('europeOnly')}` : ''}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {section === 'disagreement' && (
                            <ul className="mt-1 flex flex-col gap-1">
                                {VARIABLES.map((v) => (
                                    <li key={v.id}>
                                        {t('thresholds', {
                                            variable: tv(v.id),
                                            agree: v.disagreement.agree,
                                            split: v.disagreement.split,
                                            unit: v.unit,
                                        })}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            ))}
            <p className="text-xs text-muted-foreground">{t('attribution')}</p>
        </article>
    )
}
