import { getSlugTitle } from '@/lib/city-slug'
import { SHARE_IMAGE_SIZE } from '@/lib/page-metadata'
import { getShareImage } from '@/lib/share-image'
import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_LOCALE } from '@fa/shared/api'

// The image depends on the slug alone (crawlers send no language cookie, so it is in English), so a day in the
// browser's and the crawlers' caches saves drawing it again.
const HEADERS = { 'Cache-Control': 'public, max-age=86400' }

export const alt = en.seo.imageAlt
export const size = SHARE_IMAGE_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    return getShareImage({
        title: getSlugTitle(slug, DEFAULT_LOCALE),
        subtitle: en.seo.imageSubtitle,
        headers: HEADERS,
    })
}
