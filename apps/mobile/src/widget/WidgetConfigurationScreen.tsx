import { apiGet } from '@fa/api-client/api'
import { City } from '@fa/shared/api'
import { getCityLabel } from '@fa/shared/format'
import { getPlaceList, Place } from '@fa/shared/places'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { WidgetConfigurationScreenProps } from 'react-native-android-widget'
import { IntlProvider, useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../hooks/usePlaces'
import { useTheme } from '../hooks/useTheme'
import { CATALOGS } from '../lib/catalogs'
import { getFlagEmoji } from '../lib/flag'
import { WidgetCity } from './widget-model'
import { refreshWidget, toWidgetCity } from './widget-render'
import { widgetBindings } from './widget-store'
import { getAppLocale } from './widget-translator'

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: 20, gap: 8 },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    row: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
    rowText: { fontSize: 15 },
    text: { fontSize: 14, lineHeight: 20 },
    cancel: { alignSelf: 'flex-end', padding: 12 },
})

// A stored place has no time zone, which the widget needs for local days; the city record has it. Without the
// network the widget falls back to UTC until the app next loads that city and redraws it.
const getWidgetCity = async (place: Place): Promise<WidgetCity> => {
    try {
        return toWidgetCity(await apiGet<City>(`/cities/${place.slug}`))
    } catch {
        return { ...place, timezone: 'UTC' }
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
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
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
                        {pending === place.id ? (
                            <ActivityIndicator color={colors.primary} />
                        ) : (
                            <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                                {getFlagEmoji(place.countryCode)} {getCityLabel(place, locale)}
                            </Text>
                        )}
                    </Pressable>
                ))}
                <Pressable onPress={() => setResult('cancel')} style={styles.cancel} accessibilityRole="button">
                    <Text style={[styles.rowText, { color: colors.primary }]}>{t('cancel')}</Text>
                </Pressable>
            </ScrollView>
        </View>
    )
}

// Android opens this as its own activity when a widget is placed or reconfigured, outside the app's navigation.
export function WidgetConfigurationScreen(props: WidgetConfigurationScreenProps) {
    const locale = getAppLocale()

    return (
        <IntlProvider locale={locale} messages={CATALOGS[locale]}>
            <PlacePicker {...props} />
        </IntlProvider>
    )
}
