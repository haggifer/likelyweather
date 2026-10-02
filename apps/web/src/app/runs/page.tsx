import { RunsView } from '@/components/runs/RunsView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('nav')

    return { title: t('runs') }
}

export default function RunsPage() {
    return <RunsView />
}
