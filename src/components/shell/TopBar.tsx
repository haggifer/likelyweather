'use client'

import CityTabs from '@/components/city/CityTabs'
import UpdatedChip from '@/components/city/UpdatedChip'
import VariableSwitch from '@/components/city/VariableSwitch'
import LanguageSwitch from '@/components/shell/LanguageSwitch'
import MoreMenu from '@/components/shell/MoreMenu'
import SearchBox from '@/components/shell/SearchBox'
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
            <div className="mx-auto flex h-(--topbar-h) max-w-[1400px] items-center gap-3 px-4 sm:px-(--pane-padding)">
                <Link
                    href="/"
                    className="flex shrink-0 items-center gap-2 font-heading text-[15px] font-bold tracking-tight"
                >
                    <CloudSun className="size-5 text-primary" aria-hidden="true" />
                    <span className="max-sm:sr-only">Forecast Arena</span>
                </Link>
                <SearchBox enableShortcut />
                {slug && <CityTabs slug={slug} className="hidden lg:flex" />}
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
