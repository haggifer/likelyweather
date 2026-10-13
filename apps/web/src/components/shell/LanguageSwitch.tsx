'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S } from '@/i18n/locale-cookie'
import { cn } from '@/lib/cn'
import { LOCALES } from '@fa/shared/api'
import { LANGUAGE_NAMES } from '@fa/shared/languages'
import { Languages } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LanguageSwitch() {
    const t = useTranslations('shell')
    const locale = useLocale()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleChange = (next: string) => {
        if (next === locale) return

        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_S}; samesite=lax`
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
