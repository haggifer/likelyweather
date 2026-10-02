import { CompareView } from '@/components/compare/CompareView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('nav')

    return { title: t('compare') }
}

export default function ComparePage() {
    return <CompareView />
}
