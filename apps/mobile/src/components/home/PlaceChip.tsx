import { getCityName } from '@fa/shared/format'
import { Place } from '@fa/shared/places'
import { View } from 'react-native'
import { useLocale } from 'use-intl'
import { cn } from '../../lib/cn'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { Button } from '../ui/button'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/text'

interface IProps {
    place: Place
    isSelected: boolean
    onSelect: (slug: string) => void
}

// The city and its star are two targets in one pill, as on the web: the city is a ghost button without its own border
// or fill, which the pill draws.
export function PlaceChip({ place, isSelected, onSelect }: IProps) {
    const locale = useLocale()

    const name = getCityName(place, locale)

    return (
        <View
            className={cn(
                'flex-row items-center rounded-full border border-border bg-card pr-2.5',
                isSelected && 'border-primary bg-primary',
            )}
        >
            <Button
                variant="ghost"
                onPress={() => onSelect(place.slug)}
                accessibilityState={{ selected: isSelected }}
                className="h-9 gap-1.5 rounded-l-full rounded-r-none border-0 pr-1.5 pl-3 active:bg-transparent active:opacity-70 dark:active:bg-transparent"
            >
                <FlagIcon countryCode={place.countryCode} />
                <Text
                    numberOfLines={1}
                    className={cn('text-[0.8125rem] font-medium', isSelected && 'text-primary-foreground')}
                >
                    {name}
                </Text>
            </Button>
            <FavoriteToggle place={place} size={16} tone={isSelected ? 'inverse' : 'default'} />
        </View>
    )
}
