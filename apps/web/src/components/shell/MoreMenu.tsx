'use client'

import { isCurrentNavLink, NAV_LINKS } from '@/components/shell/MainNav'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Archive, BookOpen, CloudSun, Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS = { forecast: <CloudSun />, archive: <Archive />, methodology: <BookOpen /> }
// 36 px rows (author, 2026-10-16), like the app's menu and the language options.
const ITEM = 'min-h-9 gap-2.5 px-4'

// The header's pages on phones, where the inline links (`MainNav`) do not fit.
export function MoreMenu() {
    const t = useTranslations('nav')
    const pathname = usePathname()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('more')}
                    className="pointer-coarse:size-9 sm:hidden"
                >
                    <Menu />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {NAV_LINKS.map(({ href, key }) => (
                    <DropdownMenuItem key={href} asChild className={ITEM}>
                        <Link href={href} aria-current={isCurrentNavLink(href, pathname) ? 'page' : undefined}>
                            {ICONS[key]} {t(key)}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
