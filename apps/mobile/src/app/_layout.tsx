import { getViewerTimeZone } from '@fa/shared/format'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getLocales } from 'expo-localization'
import { Stack, useRouter } from 'expo-router'
import { Columns3, Settings } from 'lucide-react-native'
import { useEffect } from 'react'
import { Appearance, Pressable, StatusBar, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { IntlProvider, useTranslations } from 'use-intl'
import { useSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import { CATALOGS } from '../lib/catalogs'
import { CACHE_MAX_AGE_MS, queryClient, queryPersister } from '../lib/query-cache'
import { resolveLocale } from '../lib/settings'

const HomeActions = () => {
    const t = useTranslations('nav')
    const tm = useTranslations('mobile')
    const router = useRouter()
    const { colors } = useTheme()

    return (
        <View style={{ flexDirection: 'row', gap: 20 }}>
            <Pressable onPress={() => router.push('/compare')} hitSlop={8} accessibilityLabel={t('compare')}>
                <Columns3 size={22} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel={tm('settings')}>
                <Settings size={22} color={colors.foreground} />
            </Pressable>
        </View>
    )
}

// The stack lives inside the IntlProvider so screen titles come from the catalogs too.
const AppStack = () => {
    const t = useTranslations('nav')
    const tm = useTranslations('mobile')
    const { colors, isDark } = useTheme()

    return (
        <>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.card },
                    headerTintColor: colors.foreground,
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Forecast Arena', headerRight: () => <HomeActions /> }} />
                <Stack.Screen name="city/[slug]" options={{ title: '' }} />
                <Stack.Screen name="compare" options={{ title: t('compare') }} />
                <Stack.Screen name="methodology" options={{ title: t('methodology') }} />
                <Stack.Screen name="settings" options={{ title: tm('settings') }} />
            </Stack>
        </>
    )
}

export default function RootLayout() {
    const settings = useSettings()

    const locale = resolveLocale(settings.language, getLocales()[0]?.languageCode)

    // Native parts (alerts, the keyboard, the navigation bar) follow the app's theme setting too.
    useEffect(() => {
        Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme)
    }, [settings.theme])

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE_MS }}
            >
                <IntlProvider locale={locale} messages={CATALOGS[locale]} timeZone={getViewerTimeZone()}>
                    <AppStack />
                </IntlProvider>
            </PersistQueryClientProvider>
        </GestureHandlerRootView>
    )
}
