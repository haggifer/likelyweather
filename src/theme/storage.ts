import { ResolvedTheme } from '@/theme/resolve'
import { ThemeState } from '@/theme/tokens'

export const LAB_STORAGE_KEY = 'fa.themelab.v1'
export const FAVORITES_STORAGE_KEY = 'fa.themelab.favorites'
export const LAB_URL_PARAM = 'tl'

export interface Favorite {
    name: string
    state: ThemeState
}

interface StoredTheme {
    v: 1
    state: ThemeState
    css: { vars: Record<string, string>; attrs: Record<string, string>; dark: boolean }
}

export const saveTheme = (state: ThemeState, resolved: ResolvedTheme) => {
    const payload: StoredTheme = {
        v: 1,
        state,
        css: { vars: resolved.vars, attrs: resolved.attrs, dark: resolved.mode === 'dark' },
    }

    try {
        localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(payload))
    } catch {
        // blocked storage: the lab still works for this page view
    }
}

export const loadTheme = (): ThemeState | null => {
    try {
        const raw = localStorage.getItem(LAB_STORAGE_KEY)
        return raw ? ((JSON.parse(raw) as StoredTheme).state ?? null) : null
    } catch {
        return null
    }
}

export const loadFavorites = (): Favorite[] => {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
        return raw ? (JSON.parse(raw) as Favorite[]) : []
    } catch {
        return []
    }
}

export const saveFavorites = (favorites: Favorite[]) => {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
    } catch {
        // blocked storage: favorites live only in memory
    }
}

const toBase64Url = (text: string) =>
    btoa(unescape(encodeURIComponent(text)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

const fromBase64Url = (value: string) => decodeURIComponent(escape(atob(value.replace(/-/g, '+').replace(/_/g, '/'))))

export const encodeStateToUrl = (state: ThemeState) => toBase64Url(JSON.stringify(state))

export const decodeStateFromUrl = (param: string | null): ThemeState | null => {
    if (!param) return null

    try {
        return JSON.parse(fromBase64Url(param)) as ThemeState
    } catch {
        return null
    }
}

// Re-applies the saved lab combination before first paint. It reads only the cached resolved CSS.
export const LAB_RESTORE = `(function(){try{
var raw=localStorage.getItem(${JSON.stringify(LAB_STORAGE_KEY)});if(!raw)return;
var d=JSON.parse(raw);if(!d||!d.css)return;
var el=document.documentElement,c=d.css;
for(var k in c.vars){el.style.setProperty(k,c.vars[k]);}
for(var a in c.attrs){el.setAttribute('data-'+a,c.attrs[a]);}
el.classList.toggle('dark',!!c.dark);
}catch(e){}})();`
