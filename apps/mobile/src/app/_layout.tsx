import { getViewerTimeZone } from '@fa/shared/format'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getLocales } from 'expo-localization'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { Appearance, StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { IntlProvider, useTranslations } from 'use-intl'
import { HeaderBackground } from '../components/shell/HeaderBackground'
import { MoreMenu } from '../components/shell/MoreMenu'
import { Wordmark } from '../components/shell/Wordmark'
import { SnackbarHost } from '../components/ui/SnackbarHost'
import { useAppFonts } from '../hooks/useAppFonts'
import { useSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import { CATALOGS } from '../lib/catalogs'
import { CACHE_BUSTER, CACHE_MAX_AGE_MS, queryClient, queryPersister } from '../lib/query-cache'
import { dropExpiredQuota } from '../lib/quota-reset'
import { resolveLocale } from '../lib/settings'
import { getFontFamily } from '../theme/fonts'

// The stack lives inside the IntlProvider so screen titles come from the catalogs too.
const AppStack = () => {
    const tm = useTranslations('mobile')
    const { colors, isDark } = useTheme()

    return (
        <>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack
                screenOptions={{
                    headerBackground: () => <HeaderBackground />,
                    headerTintColor: colors.foreground,
                    headerTitleStyle: { fontFamily: getFontFamily('600') },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.background },
                    headerRight: () => <MoreMenu />,
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Forecast Arena', headerTitle: () => <Wordmark /> }} />
                <Stack.Screen name="city/[slug]" options={{ title: '' }} />
                {/* Compare and Methodology open with their own heading, as on the web, so the header names nothing. */}
                <Stack.Screen name="compare" options={{ title: '' }} />
                <Stack.Screen name="methodology" options={{ title: '' }} />
                <Stack.Screen name="settings" options={{ title: tm('settings') }} />
                <Stack.Screen name="+not-found" options={{ title: '' }} />
            </Stack>
            <SnackbarHost />
        </>
    )
}

export default function RootLayout() {
    const settings = useSettings()
    const isFontReady = useAppFonts()

    const locale = resolveLocale(settings.language, getLocales()[0]?.languageCode)

    // Native parts (alerts, the keyboard, the navigation bar) follow the app's theme setting too.
    useEffect(() => {
        Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme)
    }, [settings.theme])

    // Inter loads from the bundle in a moment; drawing before it would show every screen in the system font first.
    if (!isFontReady) return null

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE_MS, buster: CACHE_BUSTER }}
                onSuccess={() => dropExpiredQuota(queryClient, new Date())}
            >
                <IntlProvider locale={locale} messages={CATALOGS[locale]} timeZone={getViewerTimeZone()}>
                    <AppStack />
                </IntlProvider>
            </PersistQueryClientProvider>
        </GestureHandlerRootView>
    )
}
