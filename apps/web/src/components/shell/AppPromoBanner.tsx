'use client'

import { Button } from '@/components/ui/button'
import { useAppPromo } from '@/hooks/useAppPromo'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

// Set on <html> while the banner is up, so the page's bottom padding keeps the footer reachable above it.
const HEIGHT_VARIABLE = '--app-promo-h'
const HEIGHT = 'calc(4rem + env(safe-area-inset-bottom))'

export function AppPromoBanner() {
    const t = useTranslations('promo')

    const { isVisible, url, dismiss } = useAppPromo()

    useEffect(() => {
        if (!isVisible) return

        document.documentElement.style.setProperty(HEIGHT_VARIABLE, HEIGHT)
        return () => {
            document.documentElement.style.removeProperty(HEIGHT_VARIABLE)
        }
    }, [isVisible])

    if (!isVisible || !url) return null

    return (
        <section
            role="region"
            aria-label={t('label')}
            className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-card-foreground motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200 motion-safe:ease-out"
        >
            <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-balance">{t('body')}</p>
            <Button asChild className="h-10 px-4 text-base font-semibold">
                <a href={url} target="_blank" rel="noopener noreferrer">
                    {t('cta')}
                </a>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="-mr-2 touch:size-10"
                onClick={dismiss}
                aria-label={t('dismiss')}
            >
                <X />
            </Button>
        </section>
    )
}
