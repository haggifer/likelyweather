'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface IProps {
    slug: string
    className?: string
}

export default function CityTabs({ slug, className }: IProps) {
    const t = useTranslations('nav')
    const pathname = usePathname()
    const base = `/city/${slug}`
    const tabs = [
        { href: base, label: t('dashboard') },
        { href: `${base}/scoreboard`, label: t('scoreboard') },
        { href: `${base}/evolution`, label: t('evolution') },
    ]

    return (
        <nav aria-label={t('cityTabs')} className={cn('items-center gap-1 rounded-lg bg-muted p-0.5', className)}>
            {tabs.map((tab) => {
                const isActive = pathname === tab.href

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            'rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
                            isActive && 'bg-card text-foreground shadow-sm',
                        )}
                    >
                        {tab.label}
                    </Link>
                )
            })}
        </nav>
    )
}
