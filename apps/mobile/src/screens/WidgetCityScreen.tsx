import { Place } from '@fa/shared/places'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { WidgetCityPicker } from '../widget/WidgetCityPicker'
import { changeWidgetCity } from '../widget/widget-updates'

export function WidgetCityScreen() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id: string }>()

    const handlePick = async (place: Place) => {
        await changeWidgetCity(Number(id), place)

        if (router.canGoBack()) router.back()
        else router.replace('/')
    }

    return (
        <ScreenScroll className="bg-background" contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            <WidgetCityPicker onPick={handlePick} />
        </ScreenScroll>
    )
}
