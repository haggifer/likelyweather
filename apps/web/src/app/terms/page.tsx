import { LegalPage } from '@/components/legal/LegalPage'
import Terms from '@/content/legal/terms.mdx'
import { getPageMetadata } from '@/lib/page-metadata'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('legal')
    const tApp = await getTranslations('app')
    const locale = await getLocale()

    const title = t('terms')

    return { ...getPageMetadata({ title, description: tApp('tagline'), path: '/terms', locale }), title }
}

export default async function TermsPage() {
    const t = await getTranslations('legal')

    return (
        <LegalPage title={t('terms')} lastUpdated="2026-10-26">
            <Terms />
        </LegalPage>
    )
}
