import { LanguageSwitch } from '@/components/shell/LanguageSwitch'
import { MainNav } from '@/components/shell/MainNav'
import { MoreMenu } from '@/components/shell/MoreMenu'
import { QuotaMeter } from '@/components/shell/QuotaMeter'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { CloudSun } from 'lucide-react'
import Link from 'next/link'

// From `sm` the bar holds the whole nav; until `md` its gaps are narrower and the quota shows only its count, so the
// bar fits a 640 px screen instead of widening the page (author, 2026-10-14).
export function TopBar() {
    return (
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
            <div className="mx-auto flex h-(--topbar-h) max-w-[87.5rem] items-center gap-4 px-4 sm:gap-6 sm:px-(--pane-padding) md:gap-12">
                <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Forecast Arena">
                    <CloudSun className="size-8 text-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex flex-col font-heading text-[0.9375rem] leading-[1.02] font-bold tracking-tight">
                        <span>Forecast</span>
                        <span>Arena</span>
                    </span>
                </Link>
                <MainNav />
                <div className="ml-auto flex items-center gap-2">
                    <QuotaMeter />
                    <LanguageSwitch />
                    <ThemeToggle />
                    <MoreMenu />
                </div>
            </div>
        </header>
    )
}
