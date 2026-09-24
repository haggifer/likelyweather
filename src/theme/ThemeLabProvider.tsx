'use client'

import { useAppDispatch, useAppSelector } from '@/store'
import { setLegendPlacement, setThemeLabOpen } from '@/store/layoutSlice'
import { applyTheme } from '@/theme/apply'
import { buildFrozenCss } from '@/theme/freeze'
import { COLOR_MODE_EVENT } from '@/theme/mode'
import { resolve, ResolvedTheme } from '@/theme/resolve'
import { DEFAULT_STATE, getPresetState } from '@/theme/state'
import {
    decodeStateFromUrl,
    encodeStateToUrl,
    Favorite,
    LAB_URL_PARAM,
    loadFavorites,
    loadTheme,
    saveFavorites,
    saveTheme,
} from '@/theme/storage'
import { Mode, PresetId, ThemeState } from '@/theme/tokens'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export interface ThemeLabContextValue {
    state: ThemeState
    resolved: ResolvedTheme
    setField: <K extends keyof ThemeState>(key: K, value: ThemeState[K]) => void
    selectPreset: (id: PresetId) => void
    reset: () => void
    abFlip: () => void
    favorites: Favorite[]
    addFavorite: (name: string) => void
    applyFavorite: (index: number) => void
    removeFavorite: (index: number) => void
    copyCss: () => void
    copyLink: () => void
}

interface IProps {
    children: ReactNode
}

const ThemeLabContext = createContext<ThemeLabContextValue | null>(null)

const readInitialState = (): ThemeState => {
    const fromUrl = decodeStateFromUrl(new URLSearchParams(window.location.search).get(LAB_URL_PARAM))
    const saved = fromUrl ?? loadTheme()

    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE
}

const copyText = async (text: string, message: string) => {
    try {
        await navigator.clipboard.writeText(text)
        toast.success(message)
    } catch (error) {
        console.error(error)
        toast.error('Copy failed: clipboard is unavailable')
    }
}

// Rendered only on the client (next/dynamic with ssr: false) and only when NEXT_PUBLIC_THEME_LAB=1,
// so reading localStorage in the state initializers is safe.
export default function ThemeLabProvider({ children }: IProps) {
    const dispatch = useAppDispatch()
    const isOpen = useAppSelector((s) => s.layout.themeLabOpen)
    const [state, setState] = useState<ThemeState>(readInitialState)
    const [previous, setPrevious] = useState<ThemeState | null>(null)
    const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites)
    const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

    const resolved = useMemo(
        () => resolve(state, state.mode === 'system' ? (systemDark ? 'dark' : 'light') : undefined),
        [state, systemDark],
    )

    useEffect(() => {
        applyTheme(resolved)
        saveTheme(state, resolved)
        dispatch(setLegendPlacement(state.legend))
    }, [state, resolved, dispatch])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handleSystemChange = () => setSystemDark(mq.matches)
        const handleModeChange = (e: Event) => setState((s) => ({ ...s, mode: (e as CustomEvent<Mode>).detail }))

        mq.addEventListener('change', handleSystemChange)
        window.addEventListener(COLOR_MODE_EVENT, handleModeChange)

        return () => {
            mq.removeEventListener('change', handleSystemChange)
            window.removeEventListener(COLOR_MODE_EVENT, handleModeChange)
        }
    }, [])

    const commit = useCallback(
        (next: ThemeState) => {
            setPrevious(state)
            setState(next)
        },
        [state],
    )

    const setField = useCallback<ThemeLabContextValue['setField']>(
        (key, value) => commit({ ...state, [key]: value }),
        [state, commit],
    )

    const selectPreset = useCallback((id: PresetId) => commit(getPresetState(id)), [commit])

    const reset = useCallback(() => {
        commit(DEFAULT_STATE)
        toast.info('Reset to Sky (light)')
    }, [commit])

    const abFlip = useCallback(() => {
        if (!previous) {
            toast.message('Make a change first: A/B flips between the last two combinations')
            return
        }

        setPrevious(state)
        setState(previous)
    }, [previous, state])

    const updateFavorites = useCallback((next: Favorite[]) => {
        setFavorites(next)
        saveFavorites(next)
    }, [])

    const addFavorite = useCallback(
        (name: string) => {
            updateFavorites([...favorites, { name: name || `Favorite ${favorites.length + 1}`, state }])
            toast.success('Saved to favorites')
        },
        [favorites, state, updateFavorites],
    )

    const applyFavorite = useCallback((index: number) => commit(favorites[index].state), [favorites, commit])

    const removeFavorite = useCallback(
        (index: number) => updateFavorites(favorites.filter((_, i) => i !== index)),
        [favorites, updateFavorites],
    )

    const copyCss = useCallback(
        () => void copyText(buildFrozenCss(state), 'CSS copied: paste into globals.css'),
        [state],
    )

    const copyLink = useCallback(() => {
        const url = new URL(window.location.href)
        url.searchParams.set(LAB_URL_PARAM, encodeStateToUrl(state))
        void copyText(url.toString(), 'Shareable link copied')
    }, [state])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return

            if (e.key.toLowerCase() === 't') {
                e.preventDefault()
                dispatch(setThemeLabOpen(!isOpen))
            }

            if (e.key.toLowerCase() === 'a') {
                e.preventDefault()
                abFlip()
            }
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [abFlip, dispatch, isOpen])

    const value = useMemo<ThemeLabContextValue>(
        () => ({
            state,
            resolved,
            setField,
            selectPreset,
            reset,
            abFlip,
            favorites,
            addFavorite,
            applyFavorite,
            removeFavorite,
            copyCss,
            copyLink,
        }),
        [
            state,
            resolved,
            setField,
            selectPreset,
            reset,
            abFlip,
            favorites,
            addFavorite,
            applyFavorite,
            removeFavorite,
            copyCss,
            copyLink,
        ],
    )

    return <ThemeLabContext.Provider value={value}>{children}</ThemeLabContext.Provider>
}

export const useThemeLab = (): ThemeLabContextValue => {
    const ctx = useContext(ThemeLabContext)

    if (!ctx) throw new Error('useThemeLab must be used within ThemeLabProvider')

    return ctx
}
