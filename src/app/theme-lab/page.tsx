import Gallery from '@/components/gallery/Gallery'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Theme Lab', robots: { index: false } }

export default function ThemeLabPage() {
    if (process.env.NEXT_PUBLIC_THEME_LAB !== '1') notFound()

    return <Gallery />
}
