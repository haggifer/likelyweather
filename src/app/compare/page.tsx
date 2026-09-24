import CompareView from '@/components/compare/CompareView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => ({ title: (await getTranslations('nav'))('compare') })

export default function ComparePage() {
    return <CompareView />
}
