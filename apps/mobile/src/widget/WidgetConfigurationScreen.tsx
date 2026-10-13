import { apiGet } from '@fa/api-client/api'
import { City } from '@fa/shared/api'
import { getCityLabel } from '@fa/shared/format'
import { getPlaceList, Place } from '@fa/shared/places'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { WidgetConfigurationScreenProps } from 'react-native-android-widget'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { IntlProvider, useLocale, useTranslations } from 'use-intl'
import { Text } from '../components/legacy-ui/Text'
import { FlagIcon } from '../components/ui/FlagIcon'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { useAppFonts } from '../hooks/useAppFonts'
import { usePlaces } from '../hooks/usePlaces'
import { useTheme } from '../hooks/useTheme'
import { CATALOGS } from '../lib/catalogs'
import { WidgetCity } from './widget-model'
import { refreshWidget, toWidgetCity } from './widget-render'
import { widgetBindings } from './widget-store'
import { getAppLocale } from './widget-translator'

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: 20, gap: 8 },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    row: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    rowText: { flex: 1, fontSize: 15 },
    cancelText: { fontSize: 15 },
    text: { fontSize: 14, lineHeight: 20 },
    cancel: { alignSelf: 'flex-end', padding: 12 },
})

// A stored place has no time zone, which the widget needs for local days; the city record has it. Without the
// network the zone stays unknown until the widget's first refresh that reaches the server.
const getWidgetCity = async (place: Place): Promise<WidgetCity> => {
    try {
        return toWidgetCity(await apiGet<City>(`/cities/${place.slug}`))
    } catch {
        return { ...place, timezone: null }
    }
}

// The places the viewer already has, favorites first, so the widget never needs a server-side city list.
const PlacePicker = ({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) => {
    const t = useTranslations('widget')
    const locale = useLocale()
    const places = usePlaces()
    const { colors } = useTheme()

    const [pending, setPending] = useState<number | null>(null)

    const list = getPlaceList(places)

    const handlePick = async (place: Place) => {
        setPending(place.id)

        const city = await getWidgetCity(place)

        widgetBindings.set((bindings) => ({ ...bindings, [widgetInfo.widgetId]: city }))
        renderWidget(await refreshWidget(widgetInfo.widgetId, widgetInfo.widgetName))
        setResult('ok')
    }

    return (
        <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
            <ScreenScroll contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: colors.foreground }]}>{t('configureTitle')}</Text>
                {!list.length && (
                    <Text style={[styles.text, { color: colors['muted-foreground'] }]}>{t('configureEmpty')}</Text>
                )}
                {list.map((place) => (
                    <Pressable
                        key={place.id}
                        onPress={() => void handlePick(place)}
                        disabled={pending !== null}
                        accessibilityRole="button"
                        style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <FlagIcon countryCode={place.countryCode} />
                        <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                            {getCityLabel(place, locale)}
                        </Text>
                        {pending === place.id && <ActivityIndicator color={colors.primary} />}
                    </Pressable>
                ))}
                <Pressable onPress={() => setResult('cancel')} style={styles.cancel} accessibilityRole="button">
                    <Text style={[styles.cancelText, { color: colors.primary }]}>{t('cancel')}</Text>
                </Pressable>
            </ScreenScroll>
        </SafeAreaView>
    )
}

// Android opens this as its own activity when a widget is placed or reconfigured, outside the app's navigation and
// its safe-area provider; with no header above it, the screen keeps clear of the status bar itself.
export function WidgetConfigurationScreen(props: WidgetConfigurationScreenProps) {
    const isFontReady = useAppFonts()

    const locale = getAppLocale()

    // Android wants an element back from a configuration screen, even an empty one.
    if (!isFontReady) return <></>

    return (
        <SafeAreaProvider>
            <IntlProvider locale={locale} messages={CATALOGS[locale]}>
                <PlacePicker {...props} />
            </IntlProvider>
        </SafeAreaProvider>
    )
}
