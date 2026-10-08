export type ColorMode = 'light' | 'dark'

const MODE_STORAGE_KEY = 'fa.mode'

// Charts read their colors from CSS variables, so they subscribe to this (`subscribeColorMode`) to re-read them.
const COLOR_MODE_EVENT = 'colormodechange'

// Runs in <head> before paint: explicit choice first, system preference otherwise.
export const MODE_RESTORE = `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});var d=m?m==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})();`

export const subscribeColorMode = (onChange: () => void) => {
    window.addEventListener(COLOR_MODE_EVENT, onChange)
    return () => window.removeEventListener(COLOR_MODE_EVENT, onChange)
}

export const getColorMode = (): ColorMode =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export const setColorMode = (mode: ColorMode) => {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch {
        // storage can be blocked; the class toggle below still applies for this page view
    }

    document.documentElement.classList.toggle('dark', mode === 'dark')
    window.dispatchEvent(new CustomEvent<ColorMode>(COLOR_MODE_EVENT, { detail: mode }))
}
