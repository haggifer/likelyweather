'use client'

import { cn } from '@/lib/cn'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The forecast, then the pages beside it (author, 2026-10-12 and 10-13): the archive, then the methodology, which left
// the footer for here. Phones reach them through the menu (`MoreMenu`).
export const NAV_LINKS = [
    { href: '/', key: 'forecast' },
    { href: '/archive', key: 'archive' },
    { href: '/methodology', key: 'methodology' },
] as const

// A city's dashboard is part of the forecast.
export const isCurrentNavLink = (href: string, pathname: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/city/') : pathname === href

export function MainNav() {
    const t = useTranslations('nav')
    const pathname = usePathname()

    return (
        <nav aria-label={t('main')} className="flex items-center gap-1 max-sm:hidden">
            {NAV_LINKS.map(({ href, key }) => {
                const isCurrent = isCurrentNavLink(href, pathname)

                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={cn(
                            'rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                            isCurrent && 'bg-muted text-foreground',
                        )}
                    >
                        {t(key)}
                    </Link>
                )
            })}
        </nav>
    )
}
