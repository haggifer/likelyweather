'use client'

import { NAV_LINKS } from '@/components/shell/MainNav'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Archive, BookOpen, Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

const ICONS = { archive: <Archive />, methodology: <BookOpen /> }

// The header's pages on phones, where the inline links (`MainNav`) do not fit.
export function MoreMenu() {
    const t = useTranslations('nav')

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
                    <DropdownMenuItem key={href} asChild>
                        <Link href={href}>
                            {ICONS[key]} {t(key)}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
