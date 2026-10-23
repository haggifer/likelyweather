import { formatTime } from '@fa/shared/format'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

interface IProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

// On touch screens each entry of the table of contents is a 36 px row; links inside sentences keep the text's size.
const CONTENTS_LINKS =
    'touch:[&_#table-of-contents+ol_a]:inline-flex touch:[&_#table-of-contents+ol_a]:min-h-9 touch:[&_#table-of-contents+ol_a]:items-center'

// The legal texts are in English only; the page around them follows the chosen language.
export async function LegalPage({ title, lastUpdated, children }: IProps) {
    const t = await getTranslations('legal')
    const locale = await getLocale()

    return (
        <article className={`mx-auto max-w-3xl text-sm leading-relaxed ${CONTENTS_LINKS}`}>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted-foreground">
                {t('lastUpdated', { date: formatTime(lastUpdated, 'UTC', locale, { dateStyle: 'long' }) })}
            </p>
            {locale !== 'en' && <p className="mt-1 text-muted-foreground">{t('englishOnly')}</p>}
            {children}
        </article>
    )
}
