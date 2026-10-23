'use client'

import { useNavLinks } from '@/hooks/useNavLinks'
import { cn } from '@/lib/cn'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// The header's pages inline; phones reach them through the menu (`MoreMenu`).
export function MainNav() {
    const t = useTranslations('nav')
    const { links, handleClick } = useNavLinks()

    return (
        <nav aria-label={t('main')} className="flex items-center gap-1 max-sm:hidden">
            {links.map((link) => (
                <Link
                    key={link.key}
                    href={link.href}
                    onClick={(e) => handleClick(link, e)}
                    aria-current={link.isCurrent ? 'page' : undefined}
                    className={cn(
                        'rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        link.isCurrent && 'bg-muted text-foreground',
                    )}
                >
                    {t(link.key)}
                </Link>
            ))}
        </nav>
    )
}
