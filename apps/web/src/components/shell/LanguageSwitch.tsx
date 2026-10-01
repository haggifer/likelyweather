'use client'

import { Locale, LOCALES } from '@fa/shared/api'
import { Button } from '@fa/ui/components/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@fa/ui/components/dropdown-menu'
import { cn } from '@fa/ui/lib/cn'
import { Languages } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

const LOCALE_COOKIE = 'NEXT_LOCALE'
const ONE_YEAR_SECONDS = 31_536_000

// Endonyms: each language is listed in its own name so a reader can always find theirs.
const LANGUAGE_NAMES: Record<Locale, string> = {
    [Locale.Uk]: 'Українська',
    [Locale.En]: 'English',
    [Locale.Es]: 'Español',
    [Locale.De]: 'Deutsch',
    [Locale.Fr]: 'Français',
}

export default function LanguageSwitch() {
    const t = useTranslations('shell')
    const locale = useLocale()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleChange = (next: string) => {
        if (next === locale) return

        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
        startTransition(() => router.refresh())
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('language')}
                    className={cn('pointer-coarse:h-9', isPending && 'opacity-60')}
                >
                    <Languages />
                    <span className="text-xs font-semibold uppercase">{locale}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
                    {LOCALES.map((l) => (
                        <DropdownMenuRadioItem key={l} value={l} lang={l}>
                            {LANGUAGE_NAMES[l]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
