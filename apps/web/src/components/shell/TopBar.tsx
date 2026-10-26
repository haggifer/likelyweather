import { LanguageSwitch } from '@/components/shell/LanguageSwitch'
import { MainNav } from '@/components/shell/MainNav'
import { MoreMenu } from '@/components/shell/MoreMenu'
import { QuotaMeter } from '@/components/shell/QuotaMeter'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { CloudSun } from 'lucide-react'
import Link from 'next/link'

export function TopBar() {
    return (
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
            <div className="mx-auto flex h-(--topbar-h) max-w-[87.5rem] items-center gap-4 px-4 sm:gap-12 sm:px-(--pane-padding)">
                <Link href="/" className="flex shrink-0 items-center gap-2 touch:h-9" aria-label="Likely Weather">
                    <CloudSun className="size-8 text-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex flex-col font-logo text-[1rem] leading-[1.02] font-semibold tracking-tight">
                        <span>likely</span>
                        <span>weather</span>
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
