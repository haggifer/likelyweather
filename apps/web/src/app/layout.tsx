import { Providers } from '@/app/Providers'
import { AppPromoBanner } from '@/components/shell/AppPromoBanner'
import { Footer } from '@/components/shell/Footer'
import { TopBar } from '@/components/shell/TopBar'
import { MODE_RESTORE } from '@/lib/color-mode'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin', 'cyrillic'] })
const FONT_VARIABLES = `${inter.variable} ${jetbrainsMono.variable}`

export const generateMetadata = async (): Promise<Metadata> => {
    const t = await getTranslations('app')

    return { title: { default: 'Forecast Arena', template: '%s · Forecast Arena' }, description: t('tagline') }
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
                        <main className="mx-auto w-full max-w-[87.5rem] flex-1 px-4 py-5 max-sm:pb-0 sm:px-(--pane-padding)">
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
