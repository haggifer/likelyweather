import { THEME_CHANGE_EVENT } from '@/theme/apply'
import { Mode } from '@/theme/tokens'

export const MODE_STORAGE_KEY = 'fa.mode'
export const COLOR_MODE_EVENT = 'colormodechange'

// Runs in <head> before paint: explicit choice first, system preference otherwise.
export const MODE_RESTORE = `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});var d=m?m==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})();`

export const getColorMode = (): Mode =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export const setColorMode = (mode: Mode) => {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch {
        // storage can be blocked; the class toggle below still applies for this page view
    }

    document.documentElement.classList.toggle('dark', mode === 'dark')
    window.dispatchEvent(new CustomEvent<Mode>(COLOR_MODE_EVENT, { detail: mode }))
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT))
}
