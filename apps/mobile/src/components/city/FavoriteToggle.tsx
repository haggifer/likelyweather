import { getCityName } from '@fa/shared/format'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@fa/shared/places'
import { Star } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { placesStore } from '../../lib/places-store'
import { showSnackbar } from '../../lib/snackbar-store'

interface IProps {
    place: Place
    size?: number
    tone?: 'default' | 'inverse'
}

// Pins a place to the front of the chips. With four favorites already, a tap explains the limit instead of failing
// silently: a disabled control on a phone gives no hint why.
export function FavoriteToggle({ place, size = 22, tone = 'default' }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const places = usePlaces()
    const { colors } = useTheme()

    const isPinned = isFavorite(places, place.id)
    const label = t(isPinned ? 'unpinCity' : 'pinCity', { name: getCityName(place, locale) })
    const idleColor = tone === 'inverse' ? colors['primary-foreground'] : colors['favorite-idle']
    // On the selected chip's blue an idle star at full strength reads as pinned; the web mutes it to 70 %.
    const idleOpacity = tone === 'inverse' ? 0.7 : 1

    const handlePress = () => {
        if (!isPinnable(places, place.id)) {
            showSnackbar(t('pinLimit', { max: MAX_PLACES }))
            return
        }

        placesStore.set((current) => togglePlace(current, place))
    }

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isPinned }}
            style={{ opacity: isPinned ? 1 : idleOpacity }}
        >
            <Star
                size={size}
                color={isPinned ? colors.favorite : idleColor}
                fill={isPinned ? colors['favorite-fill'] : 'transparent'}
            />
        </Pressable>
    )
}
