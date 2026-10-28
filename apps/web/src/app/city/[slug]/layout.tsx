import { CityShell } from '@/components/city/CityShell'
import { JsonLd } from '@/components/shell/JsonLd'
import { getSlugPlace, getSlugTitle } from '@/lib/city-slug'
import { getPageMetadata } from '@/lib/page-metadata'
import { getCityPlace, getWebPageStructuredData } from '@/lib/structured-data'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

const getCityPage = async (slug: string) => {
    const t = await getTranslations('seo')
    const locale = await getLocale()

    const city = getSlugTitle(slug, locale)

    return {
        title: t('cityTitle', { city }),
        description: t('cityDescription', { city }),
        path: `/city/${slug}`,
        locale,
        place: getSlugPlace(slug, locale),
    }
}

export const generateMetadata = async ({ params }: LayoutProps<'/city/[slug]'>): Promise<Metadata> => {
    const { slug } = await params
    const page = await getCityPage(slug)

    return { ...getPageMetadata(page), title: page.title }
}

export default async function CityLayout({ children, params }: LayoutProps<'/city/[slug]'>) {
    const { slug } = await params
    const page = await getCityPage(slug)

    const about = page.place ? getCityPlace(page.place) : undefined

    return (
        <>
            <JsonLd data={getWebPageStructuredData({ ...page, about })} />
            <CityShell slug={slug}>{children}</CityShell>
        </>
    )
}
