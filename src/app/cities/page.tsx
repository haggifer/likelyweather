import CitiesView from '@/components/cities/CitiesView'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const generateMetadata = async (): Promise<Metadata> => ({ title: (await getTranslations('nav'))('cities') })

export default function CitiesPage() {
    return <CitiesView />
}
