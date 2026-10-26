import { getErrorKind } from '@fa/api-client/error-kind'
import { getCityLabel } from '@fa/shared/format'
import { getPlaceList, Place } from '@fa/shared/places'
import { useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { SearchBox } from '../components/home/SearchBox'
import { Button } from '../components/ui/button'
import { FlagIcon } from '../components/ui/FlagIcon'
import { Text } from '../components/ui/text'
import { usePlaces } from '../hooks/usePlaces'
import { cn } from '../lib/cn'
import { placesStore } from '../lib/places-store'
import { showSnackbar } from '../lib/snackbar-store'

interface IProps {
    // Marked and first in the list.
    current?: Place | null
    onPick: (place: Place) => Promise<void>
}

const getPickList = (places: Place[], current: Place | null) =>
    current ? [current, ...places.filter((place) => place.slug !== current.slug)] : places

export function WidgetCityPicker({ current = null, onPick }: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale()
    const places = usePlaces()

    const [pending, setPending] = useState<number | null>(null)
    // A second tap can land before the rows render disabled; the widget takes the first place only.
    const isPickingRef = useRef(false)

    const list = getPickList(getPlaceList(places), current)

    const handlePick = async (place: Place) => {
        if (isPickingRef.current) return

        isPickingRef.current = true
        setPending(place.id)

        // A pick that succeeds leaves the screen, so only a failure unlocks the rows for another try.
        try {
            await onPick(place)
        } catch (error) {
            console.warn(`The widget could not take ${place.slug}: ${String(error)}`)
            showSnackbar(te(getErrorKind(error)), [], { isError: true })
            isPickingRef.current = false
            setPending(null)
        }
    }

    // The search box stores a new pick as the newest recent place before it reports the slug.
    const handleSelectCity = (slug: string) => {
        const place = getPlaceList(placesStore.get()).find((p) => p.slug === slug)

        if (place) void handlePick(place)
    }

    return (
        <View className="gap-4">
            <SearchBox onSelectCity={handleSelectCity} isLocateShown />
            {list.length > 0 && (
                <View className="gap-2">
                    <Text className="text-[0.8125rem] font-medium text-muted-foreground">{t('places')}</Text>
                    {list.map((place) => (
                        <Button
                            key={place.id}
                            variant="outline"
                            onPress={() => void handlePick(place)}
                            disabled={pending !== null}
                            accessibilityState={{ selected: place.slug === current?.slug }}
                            className={cn(
                                'h-auto min-h-12 justify-start gap-2 px-3',
                                place.slug === current?.slug ? 'border-primary/40 bg-accent' : 'bg-card',
                            )}
                        >
                            <FlagIcon countryCode={place.countryCode} />
                            <Text numberOfLines={1} className="flex-1 text-[0.9375rem] font-normal">
                                {getCityLabel(place, locale)}
                            </Text>
                            {pending === place.id && <ActivityIndicator colorClassName="accent-primary" />}
                        </Button>
                    ))}
                </View>
            )}
        </View>
    )
}
