'use client'

import { Button } from '@fa/ui/components/button'
import { getColorMode, setColorMode, subscribeColorMode } from '@fa/ui/lib/colorMode'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

export default function ThemeToggle() {
    const t = useTranslations('shell')
    const mode = useSyncExternalStore(subscribeColorMode, getColorMode, () => 'light' as const)
    const next = mode === 'dark' ? 'light' : 'dark'

    return (
        <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-9"
            onClick={() => setColorMode(next)}
            aria-label={t('switchMode', { mode: t(`modes.${next}`) })}
            title={t('switchMode', { mode: t(`modes.${next}`) })}
        >
            {mode === 'dark' ? <Sun /> : <Moon />}
        </Button>
    )
}
