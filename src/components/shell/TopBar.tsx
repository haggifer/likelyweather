'use client'

import UpdatedChip from '@/components/city/UpdatedChip'
import VariableSwitch from '@/components/city/VariableSwitch'
import LanguageSwitch from '@/components/shell/LanguageSwitch'
import MoreMenu from '@/components/shell/MoreMenu'
import ThemeToggle from '@/components/shell/ThemeToggle'
import { CloudSun } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CITY_ROUTE = /^\/city\/([^/]+)/

export default function TopBar() {
    const pathname = usePathname()
    const slug = pathname.match(CITY_ROUTE)?.[1]

    return (
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
            <div className="mx-auto flex h-(--topbar-h) max-w-[1400px] items-center gap-4 px-4 sm:px-(--pane-padding)">
                <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Forecast Arena">
                    <CloudSun className="size-8 text-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex flex-col font-heading text-[15px] leading-[1.02] font-bold tracking-tight">
                        <span>Forecast</span>
                        <span>Arena</span>
                    </span>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                    {slug && <VariableSwitch className="hidden xl:flex" />}
                    {slug && <UpdatedChip slug={slug} className="hidden lg:inline-flex" />}
                    <LanguageSwitch />
                    <ThemeToggle />
                    <MoreMenu />
                </div>
            </div>
        </header>
    )
}
