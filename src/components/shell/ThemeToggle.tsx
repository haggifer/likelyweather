'use client'

import { Button } from '@/components/ui/button'
import { THEME_CHANGE_EVENT } from '@/theme/apply'
import { getColorMode, setColorMode } from '@/theme/mode'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
}

export default function ThemeToggle() {
    const t = useTranslations('shell')
    const mode = useSyncExternalStore(subscribe, getColorMode, () => 'light' as const)
    const next = mode === 'dark' ? 'light' : 'dark'

    return (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setColorMode(next)}
            aria-label={t('switchMode', { mode: t(`modes.${next}`) })}
            title={t('switchMode', { mode: t(`modes.${next}`) })}
        >
            {mode === 'dark' ? <Sun /> : <Moon />}
        </Button>
    )
}
