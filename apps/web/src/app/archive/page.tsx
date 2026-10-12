import { ArchiveView } from '@/components/archive/ArchiveView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('archive')

    return { title: t('title') }
}

export default function ArchivePage() {
    return <ArchiveView />
}
