import { LegalPage } from '@/components/legal/LegalPage'
import Privacy from '@/content/legal/privacy.mdx'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('legal')

    return { title: t('privacy') }
}

export default async function PrivacyPage() {
    const t = await getTranslations('legal')

    return (
        <LegalPage title={t('privacy')} lastUpdated="2026-10-12">
            <Privacy />
        </LegalPage>
    )
}
