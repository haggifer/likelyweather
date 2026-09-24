'use client'

import ThemeLabPanel from '@/theme/ThemeLabPanel'
import ThemeLabProvider from '@/theme/ThemeLabProvider'

export default function ThemeLabRoot() {
    return (
        <ThemeLabProvider>
            <ThemeLabPanel />
        </ThemeLabProvider>
    )
}
