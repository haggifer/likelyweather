import { Place } from '@fa/shared/places'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSyncExternalStore } from 'react'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { widgetBindings } from '../widget/widget-store'
import { changeWidgetCity } from '../widget/widget-updates'
import { WidgetCityPicker } from '../widget/WidgetCityPicker'

export function WidgetCityScreen() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id: string }>()
    const bindings = useSyncExternalStore(widgetBindings.subscribe, widgetBindings.get)

    const handlePick = async (place: Place) => {
        await changeWidgetCity(Number(id), place)

        if (router.canGoBack()) router.back()
        else router.replace('/')
    }

    return (
        <ScreenScroll className="bg-background" contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            <WidgetCityPicker current={bindings[Number(id)] ?? null} onPick={handlePick} />
        </ScreenScroll>
    )
}
