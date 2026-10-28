import { LegalPage } from '@/components/legal/LegalPage'
import Privacy from '@/content/legal/privacy.mdx'
import { getPageMetadata } from '@/lib/page-metadata'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('legal')
    const tApp = await getTranslations('app')
    const locale = await getLocale()

    const title = t('privacy')

    return { ...getPageMetadata({ title, description: tApp('tagline'), path: '/privacy', locale }), title }
}

export default async function PrivacyPage() {
    const t = await getTranslations('legal')

    return (
        <LegalPage title={t('privacy')} lastUpdated="2026-10-26">
            <Privacy />
        </LegalPage>
    )
}
