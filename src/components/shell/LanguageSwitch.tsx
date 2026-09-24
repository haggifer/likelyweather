'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LOCALES } from '@/shared/api'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

const LOCALE_COOKIE = 'NEXT_LOCALE'
const ONE_YEAR_SECONDS = 31_536_000

export default function LanguageSwitch() {
    const t = useTranslations('shell')
    const locale = useLocale()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleChange = (next: string) => {
        if (!next || next === locale) return

        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
        startTransition(() => router.refresh())
    }

    return (
        <ToggleGroup
            type="single"
            size="sm"
            value={locale}
            onValueChange={handleChange}
            aria-label={t('language')}
            className={isPending ? 'opacity-60' : undefined}
        >
            {LOCALES.map((l) => (
                <ToggleGroupItem
                    key={l}
                    value={l}
                    className="px-2 text-xs font-semibold uppercase"
                    aria-label={t(`locales.${l}`)}
                >
                    {l}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
