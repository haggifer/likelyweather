import CityShell from '@/components/city/CityShell'
import { getCityBySlug } from '@/server/store'
import type { Metadata } from 'next'

export const generateMetadata = async ({ params }: LayoutProps<'/city/[slug]'>): Promise<Metadata> => {
    const { slug } = await params
    const city = await getCityBySlug(slug)

    return { title: city ? `${city.name}, ${city.country}` : slug }
}

export default async function CityLayout({ children, params }: LayoutProps<'/city/[slug]'>) {
    const { slug } = await params

    return <CityShell slug={slug}>{children}</CityShell>
}
