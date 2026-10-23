'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NavKey, useNavLinks } from '@/hooks/useNavLinks'
import { Archive, BookOpen, ChartSpline, CloudSun, Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ReactNode } from 'react'

const ICONS: Record<NavKey, ReactNode> = {
    overview: <CloudSun />,
    details: <ChartSpline />,
    archive: <Archive />,
    methodology: <BookOpen />,
}
// 36 px rows (author, 2026-10-16), like the app's menu and the language options.
const ITEM = 'min-h-9 gap-2.5 px-4'

// The header's pages on phones, where the inline links (`MainNav`) do not fit.
export function MoreMenu() {
    const t = useTranslations('nav')
    const { links, handleClick } = useNavLinks()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('more')} className="touch:size-9 sm:hidden">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {links.map((link) => (
                    <DropdownMenuItem key={link.key} asChild className={ITEM}>
                        <Link
                            href={link.href}
                            onClick={(e) => handleClick(link, e)}
                            aria-current={link.isCurrent ? 'page' : undefined}
                        >
                            {ICONS[link.key]} {t(link.key)}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
