import { RAIN_THRESHOLD_MM } from '@fa/shared/constants'
import { MODELS } from '@fa/shared/models'
import { VARIABLES } from '@fa/shared/variables'
import { Card, CardContent, CardHeader, CardTitle } from '@fa/ui/components/card'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

const SECTIONS = ['sources', 'median', 'disagreement', 'limits'] as const
const METHODOLOGY_VALUES = { rain: RAIN_THRESHOLD_MM }

export const generateMetadata = async (): Promise<Metadata> => ({
    title: (await getTranslations('nav'))('methodology'),
})

export default async function MethodologyPage() {
    const t = await getTranslations('methodology')
    const tv = await getTranslations('variables')

    return (
        <article className="mx-auto flex max-w-3xl flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="mt-2 text-muted-foreground">{t('intro')}</p>
            </div>
            {SECTIONS.map((section) => (
                <Card key={section} className="gap-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">{t(`${section}.title`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm leading-relaxed">
                        {t(`${section}.body`, METHODOLOGY_VALUES)
                            .split('\n')
                            .map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        {section === 'sources' && (
                            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                                {MODELS.map((m) => (
                                    <li key={m.id} className="grid grid-cols-[1rem_1fr] items-start gap-x-2">
                                        <span className="mt-2.5 h-0.5 w-4 rounded" style={{ background: m.color }} />
                                        <span>
                                            <span className="font-medium">{m.name}</span>{' '}
                                            <span className="text-muted-foreground">
                                                {m.provider}
                                                {m.regional ? ` · ${t('europeOnly')}` : ''}
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
