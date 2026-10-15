import { getCityName } from '@fa/shared/format'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@fa/shared/places'
import { Star } from 'lucide-react-native'
import { useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { placesStore } from '../../lib/places-store'
import { showSnackbar } from '../../lib/snackbar-store'
import { Icon } from '../ui/icon'
import { Toggle } from '../ui/toggle'

interface IProps {
    place: Place
    size?: number
    tone?: 'default' | 'inverse'
    // A header gives the toggle the web's 36 px box (`size-9`); a chip keeps the star's own size.
    className?: string
}

// Pins a place to the front of the chips. With four favorites already, a tap explains the limit instead of failing
// silently: a disabled control on a phone gives no hint why. The toggle keeps the star's own size, so it fits a chip;
// the header gives it a full-size box.
export function FavoriteToggle({ place, size = 20, tone = 'default', className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const places = usePlaces()
    const { colors } = useTheme()

    const isPinned = isFavorite(places, place.id)
    const label = t(isPinned ? 'unpinCity' : 'pinCity', { name: getCityName(place, locale) })
    const isInverse = tone === 'inverse'

    const handlePress = () => {
        if (!isPinnable(places, place.id)) {
            showSnackbar(t('pinLimit', { max: MAX_PLACES }))
            return
        }

        placesStore.set((current) => togglePlace(current, place))
    }

    return (
        <Toggle
            pressed={isPinned}
            onPressedChange={handlePress}
            hitSlop={8}
            accessibilityLabel={label}
            // On the selected chip's blue an idle star at full strength reads as pinned; the web mutes it to 70 %.
            className={cn('h-auto min-w-0 bg-transparent px-0', isInverse && !isPinned && 'opacity-70', className)}
        >
            <Icon
                as={Star}
                size={size}
                // The fill is an SVG attribute, which takes a colour value rather than a class.
                fill={isPinned ? colors['favorite-fill'] : 'transparent'}
                className={cn(
                    isPinned && 'text-favorite',
                    !isPinned && (isInverse ? 'text-primary-foreground' : 'text-favorite-idle'),
                )}
            />
        </Toggle>
    )
}
