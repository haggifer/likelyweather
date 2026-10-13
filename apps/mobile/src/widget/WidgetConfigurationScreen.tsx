import { apiGet } from '@fa/api-client/api'
import { City } from '@fa/shared/api'
import { getCityLabel } from '@fa/shared/format'
import { getPlaceList, Place } from '@fa/shared/places'
import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { WidgetConfigurationScreenProps } from 'react-native-android-widget'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { IntlProvider, useLocale, useTranslations } from 'use-intl'
import { Button } from '../components/ui/button'
import { FlagIcon } from '../components/ui/FlagIcon'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Text } from '../components/ui/text'
// Android opens this screen without the app's root layout, which loads the kit's styles everywhere else.
import '../global.css'
import { useAppFonts } from '../hooks/useAppFonts'
import { useAppliedTheme } from '../hooks/useAppliedTheme'
import { usePlaces } from '../hooks/usePlaces'
import { CATALOGS } from '../lib/catalogs'
import { WidgetCity } from './widget-model'
import { refreshWidget, toWidgetCity } from './widget-render'
import { widgetBindings } from './widget-store'
import { getAppLocale } from './widget-translator'

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
        <View className="flex-1 bg-background">
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <ScreenScroll contentContainerClassName="gap-2 p-5">
                    <Text role="heading" className="mb-2 text-xl font-bold">
                        {t('configureTitle')}
                    </Text>
                    {!list.length && <Text className="text-sm text-muted-foreground">{t('configureEmpty')}</Text>}
                    {list.map((place) => (
                        <Button
                            key={place.id}
                            variant="outline"
                            onPress={() => void handlePick(place)}
                            disabled={pending !== null}
                            className="h-auto min-h-12 justify-start gap-2 bg-card px-3"
                        >
                            <FlagIcon countryCode={place.countryCode} />
                            <Text numberOfLines={1} className="flex-1 text-[0.9375rem] font-normal">
                                {getCityLabel(place, locale)}
                            </Text>
                            {pending === place.id && <ActivityIndicator colorClassName="accent-primary" />}
                        </Button>
                    ))}
                    <Button variant="link" onPress={() => setResult('cancel')} className="h-12 self-end px-3">
                        <Text className="text-[0.9375rem]">{t('cancel')}</Text>
                    </Button>
                </ScreenScroll>
            </SafeAreaView>
        </View>
    )
}

// Android opens this as its own activity when a widget is placed or reconfigured, outside the app's navigation and
// its safe-area provider; with no header above it, the screen keeps clear of the status bar itself.
export function WidgetConfigurationScreen(props: WidgetConfigurationScreenProps) {
    const isFontReady = useAppFonts()
    useAppliedTheme()

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
