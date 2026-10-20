import { getViewerTimeZone } from '@fa/shared/format'
import { PortalHost } from '@rn-primitives/portal'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getLocales } from 'expo-localization'
import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Toaster } from 'sonner-native'
import { IntlProvider, useTranslations } from 'use-intl'
import { HeaderBackground } from '../components/shell/HeaderBackground'
import { MoreMenu } from '../components/shell/MoreMenu'
import { Wordmark } from '../components/shell/Wordmark'
import '../global.css'
import { useAppFonts } from '../hooks/useAppFonts'
import { useAppliedTheme } from '../hooks/useAppliedTheme'
import { useSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import { CATALOGS } from '../lib/catalogs'
import { CACHE_BUSTER, CACHE_MAX_AGE_MS, queryClient, queryPersister } from '../lib/query-cache'
import { dropExpiredQuota } from '../lib/quota-reset'
import { resolveLocale } from '../lib/settings'
import { getFontFamily } from '../theme/fonts'

// The snackbars' place: as far above the navigation bar as from the screen's sides.
const TOAST_MARGIN = 16

// A link from a widget opens its screen over Home, so Back returns to the app rather than leaving it.
export const unstable_settings = { anchor: 'index' }

// The stack lives inside the IntlProvider so screen titles come from the catalogs too.
const AppStack = () => {
    const tm = useTranslations('mobile')
    const ta = useTranslations('archive')
    const { colors, isDark } = useTheme()
    const insets = useSafeAreaInsets()

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
                <Stack.Screen name="archive" options={{ title: ta('title') }} />
                {/* Methodology opens with its own heading, as on the web, so the header names nothing. */}
                <Stack.Screen name="methodology" options={{ title: '' }} />
                <Stack.Screen name="settings" options={{ title: tm('settings') }} />
                <Stack.Screen name="widget-city/[id]" options={{ title: tm('widgetChange') }} />
                <Stack.Screen name="+not-found" options={{ title: '' }} />
            </Stack>
            <Toaster position="bottom-center" offset={insets.bottom + TOAST_MARGIN} swipeToDismissDirection="left" />
            <PortalHost />
        </>
    )
}

export default function RootLayout() {
    const settings = useSettings()
    const isFontReady = useAppFonts()
    useAppliedTheme()

    const locale = resolveLocale(settings.language, getLocales()[0]?.languageCode)

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
