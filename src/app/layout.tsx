import Providers from '@/app/Providers'
import Footer from '@/components/shell/Footer'
import TopBar from '@/components/shell/TopBar'
import { MODE_RESTORE } from '@/theme/mode'
import { LAB_RESTORE } from '@/theme/storage'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import {
    Geist,
    Geist_Mono,
    IBM_Plex_Mono,
    IBM_Plex_Sans,
    Inter,
    JetBrains_Mono,
    Libre_Bodoni,
    Public_Sans,
    Space_Grotesk,
    Space_Mono,
} from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin', 'cyrillic'] })
// Theme Lab candidates: declared but not preloaded, so a browser only downloads the ones a combination uses.
const ibmPlexSans = IBM_Plex_Sans({
    variable: '--font-ibm-plex-sans',
    subsets: ['latin', 'cyrillic'],
    weight: ['400', '500', '600', '700'],
    preload: false,
})
const publicSans = Public_Sans({ variable: '--font-public-sans', subsets: ['latin'], preload: false })
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], preload: false })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'], preload: false })
const libreBodoni = Libre_Bodoni({
    variable: '--font-libre-bodoni',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    preload: false,
})
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], preload: false })
const ibmPlexMono = IBM_Plex_Mono({
    variable: '--font-ibm-plex-mono',
    subsets: ['latin', 'cyrillic'],
    weight: ['400', '500', '600'],
    preload: false,
})
const spaceMono = Space_Mono({
    variable: '--font-space-mono',
    subsets: ['latin'],
    weight: ['400', '700'],
    preload: false,
})

const FONT_VARIABLES = [
    inter,
    jetbrainsMono,
    ibmPlexSans,
    publicSans,
    geistSans,
    spaceGrotesk,
    libreBodoni,
    geistMono,
    ibmPlexMono,
    spaceMono,
]
    .map((f) => f.variable)
    .join(' ')

const IS_LAB_ENABLED = process.env.NEXT_PUBLIC_THEME_LAB === '1'

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('app')

    return { title: { default: 'Forecast Arena', template: '%s · Forecast Arena' }, description: t('tagline') }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
    const locale = await getLocale()

    return (
        <html
            lang={locale}
            className={`${FONT_VARIABLES} h-full antialiased`}
            data-density="comfortable"
            data-surface="elevated"
            data-chips="filled"
            data-bands="minmax-iqr"
            data-heatmap="blues"
            data-legend="side"
            data-sourceline="off"
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: MODE_RESTORE }} />
                {IS_LAB_ENABLED && <script dangerouslySetInnerHTML={{ __html: LAB_RESTORE }} />}
            </head>
            <body className="flex min-h-full flex-col">
                <NextIntlClientProvider>
                    <Providers>
                        <TopBar />
                        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-(--pane-padding)">
                            {children}
                        </main>
                        <Footer />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
