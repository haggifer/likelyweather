import { ResolvedTheme } from '@/theme/resolve'

export const THEME_CHANGE_EVENT = 'themechange'

export const applyTheme = (resolved: ResolvedTheme) => {
    if (typeof document === 'undefined') return

    const el = document.documentElement

    for (const [key, value] of Object.entries(resolved.vars)) {
        el.style.setProperty(key, value)
    }

    for (const [key, value] of Object.entries(resolved.attrs)) {
        el.setAttribute(`data-${key}`, value)
    }

    el.classList.toggle('dark', resolved.mode === 'dark')
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT))
}
