import { Place } from '@fa/shared/places'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { View } from 'react-native'
import { WidgetConfigurationScreenProps } from 'react-native-android-widget'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Toaster } from 'sonner-native'
import { IntlProvider, useTranslations } from 'use-intl'
import { Button } from '../components/ui/button'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Text } from '../components/ui/text'
// Android opens this screen without the app's root layout, which loads the kit's styles everywhere else.
import '../global.css'
import { useAppFonts } from '../hooks/useAppFonts'
import { useAppliedTheme } from '../hooks/useAppliedTheme'
import { CATALOGS } from '../lib/catalogs'
import { queryClient } from '../lib/query-cache'
import { bindWidgetCity } from './widget-render'
import { getAppLocale } from './widget-translator'
import { WidgetCityPicker } from './WidgetCityPicker'

const Configuration = ({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) => {
    const t = useTranslations('widget')

    const handlePick = async (place: Place) => {
        renderWidget(await bindWidgetCity(widgetInfo.widgetId, widgetInfo.widgetName, place))
        setResult('ok')
    }

    return (
        <View className="flex-1 bg-background">
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <ScreenScroll contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
                    <Text role="heading" className="text-xl font-bold">
                        {t('configureTitle')}
                    </Text>
                    <WidgetCityPicker onPick={handlePick} />
                    <Button variant="link" onPress={() => setResult('cancel')} className="h-12 self-end px-3">
                        <Text className="text-[0.9375rem]">{t('cancel')}</Text>
                    </Button>
                </ScreenScroll>
            </SafeAreaView>
        </View>
    )
}

// Android opens this as its own activity when a widget is placed or reconfigured, outside the app's navigation and
// its providers; with no header above it, the screen keeps clear of the status bar itself.
export function WidgetConfigurationScreen(props: WidgetConfigurationScreenProps) {
    const isFontReady = useAppFonts()
    useAppliedTheme()

    const locale = getAppLocale()

    // Android wants an element back from a configuration screen, even an empty one.
    if (!isFontReady) return <></>

    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <IntlProvider locale={locale} messages={CATALOGS[locale]}>
                    <Configuration {...props} />
                    <Toaster position="bottom-center" />
                    <PortalHost />
                </IntlProvider>
            </QueryClientProvider>
        </SafeAreaProvider>
    )
}
