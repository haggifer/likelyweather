'use client'

import { Button } from '@/components/ui/button'
import { getColorMode, setColorMode, subscribeColorMode } from '@/lib/color-mode'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

export function ThemeToggle() {
    const t = useTranslations('shell')
    const mode = useSyncExternalStore(subscribeColorMode, getColorMode, () => 'light' as const)

    const next = mode === 'dark' ? 'light' : 'dark'
    const label = t('switchMode', { mode: t(`modes.${next}`) })

    return (
        <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-9"
            onClick={() => setColorMode(next)}
            aria-label={label}
            title={label}
        >
            {mode === 'dark' ? <Sun /> : <Moon />}
        </Button>
    )
}
