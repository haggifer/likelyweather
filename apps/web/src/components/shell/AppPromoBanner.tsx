'use client'

import { Button } from '@/components/ui/button'
import { useAppPromo } from '@/hooks/useAppPromo'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect } from 'react'

// Set on <html> while the banner is up, so the page's bottom padding keeps the footer reachable above it.
const HEIGHT_VARIABLE = '--app-promo-h'
const HEIGHT = 'calc(4.5rem + env(safe-area-inset-bottom))'

// One dismissible bar for Android phones: there is an app, and here is its APK. Not a modal, not a notification.
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
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-(--radius) border-t bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200 motion-safe:ease-out"
        >
            <div className="flex items-center gap-3 px-4 py-2.5">
                <Image src="/icon.svg" alt="" width={32} height={32} className="size-8 shrink-0" unoptimized />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t('title')}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('body')}</p>
                </div>
                <Button asChild size="sm">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        {t('cta')}
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="touch:size-9"
                    onClick={dismiss}
                    aria-label={t('dismiss')}
                >
                    <X />
                </Button>
            </div>
            <p className="px-4 pb-2 text-[0.6875rem] leading-snug text-muted-foreground">{t('note')}</p>
        </section>
    )
}
