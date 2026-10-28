import { Landing } from '@/components/landing/Landing'
import { JsonLd } from '@/components/shell/JsonLd'
import { getPageMetadata } from '@/lib/page-metadata'
import { getSiteStructuredData } from '@/lib/structured-data'
import { SITE_NAME } from '@fa/shared/site'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('seo')
    const locale = await getLocale()

    const title = `${SITE_NAME}: ${t('homeTitle')}`

    return {
        ...getPageMetadata({ title, description: t('homeDescription'), path: '/', locale }),
        title: { absolute: title },
    }
}

export default async function HomePage() {
    const t = await getTranslations('seo')
    const locale = await getLocale()

    return (
        <>
            <JsonLd data={getSiteStructuredData(t('homeDescription'), locale)} />
            <Landing />
        </>
    )
}
