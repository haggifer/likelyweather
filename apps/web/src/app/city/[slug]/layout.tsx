import CityShell from '@/components/city/CityShell'
import { City } from '@fa/shared/api'
import type { Metadata } from 'next'

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000'

// The city list, not /cities/:slug, because that endpoint records a view.
const findCity = async (slug: string) => {
    try {
        const res = await fetch(`${API_ORIGIN}/api/cities`, { next: { revalidate: 300 } })
        const { items } = (await res.json()) as { items: City[] }

        return items.find((c) => c.slug === slug)
    } catch {
        return undefined
    }
}

export const generateMetadata = async ({ params }: LayoutProps<'/city/[slug]'>): Promise<Metadata> => {
    const { slug } = await params
    const city = await findCity(slug)

    return { title: city ? `${city.name}, ${city.country}` : slug }
}

export default async function CityLayout({ children, params }: LayoutProps<'/city/[slug]'>) {
    const { slug } = await params

    return <CityShell slug={slug}>{children}</CityShell>
}
