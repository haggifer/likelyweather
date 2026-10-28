import { Providers } from '@/app/Providers'
import { AppPromoBanner } from '@/components/shell/AppPromoBanner'
import { Footer } from '@/components/shell/Footer'
import { TopBar } from '@/components/shell/TopBar'
import { cn } from '@/lib/cn'
import { MODE_RESTORE } from '@/lib/color-mode'
import { FILL_HEIGHT_PARENT } from '@/lib/fill-height'
import { getPageTitle } from '@/lib/page-title'
import { SITE_NAME, SITE_ORIGIN } from '@fa/shared/site'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Inter, JetBrains_Mono, Lexend } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin', 'cyrillic'] })
// The logo's face: one weight, Latin only, since the logo's words are never translated.
const lexend = Lexend({ variable: '--font-lexend', subsets: ['latin'], weight: '600' })
const FONT_VARIABLES = `${inter.variable} ${jetbrainsMono.variable} ${lexend.variable}`

// Pages set their own canonical address and Open Graph fields (`getPageMetadata`); these hold for the rest.
export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('app')

    return {
        metadataBase: new URL(SITE_ORIGIN),
        applicationName: SITE_NAME,
        title: { default: SITE_NAME, template: getPageTitle('%s') },
        description: t('tagline'),
    }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
    const locale = await getLocale()

    return (
        <html lang={locale} className={`${FONT_VARIABLES} h-full antialiased`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: MODE_RESTORE }} />
            </head>
            <body className="flex min-h-full flex-col pb-(--app-promo-h,0px)">
                <NextIntlClientProvider>
                    <Providers>
                        <TopBar />
                        <main
                            className={cn(
                                'mx-auto w-full max-w-[87.5rem] flex-1 px-4 py-5 max-sm:pb-0 sm:px-(--pane-padding)',
                                FILL_HEIGHT_PARENT,
                            )}
                        >
                            {children}
                        </main>
                        <Footer />
                        <AppPromoBanner />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
