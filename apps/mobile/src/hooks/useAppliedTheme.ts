import { useEffect } from 'react'
import { Appearance } from 'react-native'
import { Uniwind } from 'uniwind'
import { useSettings } from './useSettings'

// The kit's styles (Uniwind) and the native parts (alerts, the keyboard, the navigation bar) follow the app's theme
// setting. The widget's configuration screen runs as its own activity, so it applies the setting too.
export function useAppliedTheme(): void {
    const { theme } = useSettings()

    useEffect(() => {
        Uniwind.setTheme(theme)
        Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme)
    }, [theme])
}
