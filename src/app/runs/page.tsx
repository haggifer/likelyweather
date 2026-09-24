import RunsView from '@/components/runs/RunsView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => ({ title: (await getTranslations('nav'))('runs') })

export default function RunsPage() {
    return <RunsView />
}
