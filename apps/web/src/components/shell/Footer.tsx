import { ATTRIBUTION_URLS } from '@fa/shared/attribution'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ReactNode } from 'react'

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL

const renderExternalLink = (href: string, chunks: ReactNode) => (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
        {chunks}
    </a>
)

export async function Footer() {
    const t = await getTranslations('footer')
    const tl = await getTranslations('legal')

    return (
        <footer className="border-t text-xs text-muted-foreground">
            <div className="mx-auto flex max-w-[87.5rem] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 sm:px-(--pane-padding)">
                <p>
                    {t.rich('attribution', {
                        openMeteo: (chunks) => renderExternalLink(ATTRIBUTION_URLS.openMeteo, chunks),
                        metno: (chunks) => renderExternalLink(ATTRIBUTION_URLS.metno, chunks),
                    })}
                </p>
                <nav className="ml-auto flex flex-wrap gap-x-4 gap-y-1">
                    <Link href="/privacy" className="hover:text-foreground">
                        {tl('privacy')}
                    </Link>
                    <Link href="/terms" className="hover:text-foreground">
                        {tl('terms')}
                    </Link>
                    {REPO_URL && (
                        <a href={REPO_URL} className="hover:text-foreground" target="_blank" rel="noreferrer">
                            {t('repo')}
                        </a>
                    )}
                </nav>
            </div>
        </footer>
    )
}
