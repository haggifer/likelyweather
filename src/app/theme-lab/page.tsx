import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Theme Lab', robots: { index: false } }

// Behind the inlined flag so neither the gallery nor its static data dump reaches a lab-off build.
const Gallery = process.env.NEXT_PUBLIC_THEME_LAB === '1' ? dynamic(() => import('@/components/gallery/Gallery')) : null

export default function ThemeLabPage() {
    if (!Gallery) notFound()

    return <Gallery />
}
