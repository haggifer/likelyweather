import { LegalPage } from '@/components/legal/LegalPage'
import Terms from '@/content/legal/terms.mdx'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('legal')

    return { title: t('terms') }
}

export default async function TermsPage() {
    const t = await getTranslations('legal')

    return (
        <LegalPage title={t('terms')} lastUpdated="2026-10-12">
            <Terms />
        </LegalPage>
    )
}
