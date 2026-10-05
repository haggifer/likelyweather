'use client'

import { Button } from '@fa/ui/components/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@fa/ui/components/dropdown-menu'
import { BookOpen, Building2, Columns3, Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function MoreMenu() {
    const t = useTranslations('nav')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('more')} className="pointer-coarse:size-9">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                    <Link href="/cities">
                        <Building2 /> {t('cities')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/compare">
                        <Columns3 /> {t('compare')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/methodology">
                        <BookOpen /> {t('methodology')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
