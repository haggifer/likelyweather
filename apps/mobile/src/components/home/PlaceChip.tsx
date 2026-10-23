import { getCityName } from '@fa/shared/format'
import { isFavorite, Place } from '@fa/shared/places'
import { View } from 'react-native'
import { useLocale } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { cn } from '../../lib/cn'
import { FavoriteStar } from '../city/FavoriteStar'
import { Button } from '../ui/button'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/text'

interface IProps {
    place: Place
    isSelected: boolean
    onSelect: (slug: string) => void
}

// The web's phone chip: one ghost button inside the pill, which draws its border and fill. The star only shows whether
// the place is pinned, so a tap meant for the city never pins it; the overview card's star pins.
export function PlaceChip({ place, isSelected, onSelect }: IProps) {
    const locale = useLocale()
    const places = usePlaces()

    const name = getCityName(place, locale)
    const isPinned = isFavorite(places, place.id)

    return (
        <View
            className={cn(
                'flex-row items-center rounded-full border border-border bg-card',
                isSelected && 'border-primary bg-primary',
            )}
        >
            <Button
                variant="ghost"
                onPress={() => onSelect(place.slug)}
                accessibilityState={{ selected: isSelected }}
                className="h-9 gap-1.5 rounded-full border-0 px-3"
            >
                <FlagIcon countryCode={place.countryCode} />
                <Text numberOfLines={1} className={cn('text-sm font-medium', isSelected && 'text-primary-foreground')}>
                    {name}
                </Text>
                {/* On the selected chip's blue an idle star at full strength reads as pinned; the web mutes it to 70 %. */}
                <View className={cn(isSelected && !isPinned && 'opacity-70')}>
                    <FavoriteStar isPinned={isPinned} size={16} tone={isSelected ? 'inverse' : 'default'} />
                </View>
            </Button>
        </View>
    )
}
