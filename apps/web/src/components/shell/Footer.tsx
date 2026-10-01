import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL

export async function Footer() {
    const t = await getTranslations('footer')

    return (
        <footer className="border-t text-xs text-muted-foreground">
            <div className="mx-auto flex max-w-[87.5rem] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 sm:px-(--pane-padding)">
                <p>
                    {t.rich('attribution', {
                        openMeteo: (chunks) => (
                            <a
                                href="https://open-meteo.com/"
                                className="underline underline-offset-2"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {chunks}
                            </a>
                        ),
                        metno: (chunks) => (
                            <a
                                href="https://api.met.no/"
                                className="underline underline-offset-2"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {chunks}
                            </a>
                        ),
                    })}
                </p>
                <nav className="ml-auto flex gap-4">
                    <Link href="/methodology" className="hover:text-foreground">
                        {t('methodology')}
                    </Link>
                    <Link href="/runs" className="hover:text-foreground">
                        {t('runs')}
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
