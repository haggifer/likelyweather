import { getCityName } from '@fa/shared/format'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@fa/shared/places'
import { Star } from 'lucide-react-native'
import { useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { placesStore } from '../../lib/places-store'
import { Hint } from '../shell/Hint'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Toggle } from '../ui/toggle'

interface IProps {
    place: Place
    size?: number
    tone?: 'default' | 'inverse'
    // A header gives the toggle the web's 36 px box (`size-9`); a chip keeps the star's own size.
    className?: string
}

// Pins a place to the front of the chips. With four favorites already the star looks disabled and a tap explains the
// limit in a hint bubble, as on the web. The toggle keeps the star's own size, so it fits a chip; the header gives it
// the web's 36 px box.
export function FavoriteToggle({ place, size = 20, tone = 'default', className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const places = usePlaces()
    const { colors } = useTheme()

    const isPinned = isFavorite(places, place.id)
    const label = t(isPinned ? 'unpinCity' : 'pinCity', { name: getCityName(place, locale) })
    const isInverse = tone === 'inverse'
    const star = (
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
    )

    const handleToggle = () => placesStore.set((current) => togglePlace(current, place))

    if (!isPinnable(places, place.id)) {
        return (
            <Hint content={t('pinLimit', { max: MAX_PLACES })} className="max-w-64">
                <Button
                    variant="ghost"
                    hitSlop={8}
                    accessibilityLabel={label}
                    accessibilityState={{ disabled: true }}
                    className={cn('h-auto min-w-0 px-0 opacity-50', className)}
                >
                    {star}
                </Button>
            </Hint>
        )
    }

    return (
        <Toggle
            pressed={isPinned}
            onPressedChange={handleToggle}
            hitSlop={8}
            accessibilityLabel={label}
            // On the selected chip's blue an idle star at full strength reads as pinned; the web mutes it to 70 %.
            className={cn('h-auto min-w-0 bg-transparent px-0', isInverse && !isPinned && 'opacity-70', className)}
        >
            {star}
        </Toggle>
    )
}
