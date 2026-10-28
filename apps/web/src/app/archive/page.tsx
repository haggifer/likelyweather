import { ArchiveView } from '@/components/archive/ArchiveView'
import { JsonLd } from '@/components/shell/JsonLd'
import { getPageMetadata } from '@/lib/page-metadata'
import { getWebPageStructuredData } from '@/lib/structured-data'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

const getArchivePage = async () => {
    const t = await getTranslations()
    const locale = await getLocale()

    return { title: t('archive.title'), description: t('seo.archiveDescription'), path: '/archive', locale }
}

export const generateMetadata = async (): Promise<Metadata> => {
    const page = await getArchivePage()

    return { ...getPageMetadata(page), title: page.title }
}

export default async function ArchivePage() {
    const page = await getArchivePage()

    return (
        <>
            <JsonLd data={getWebPageStructuredData(page)} />
            <ArchiveView />
        </>
    )
}
