import { getCityName } from '@fa/shared/format'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@fa/shared/places'
import { useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { cn } from '../../lib/cn'
import { placesStore } from '../../lib/places-store'
import { Hint } from '../shell/Hint'
import { Button } from '../ui/button'
import { Toggle } from '../ui/toggle'
import { FavoriteStar } from './FavoriteStar'

const STAR_SIZE = 20

interface IProps {
    place: Place
    // A header gives the toggle the web's 36 px box (`size-9`).
    className?: string
}

// Pins a place to the front of the chips. With four favorites already the star looks disabled and a tap explains the
// limit in a hint bubble, as on the web.
export function FavoriteToggle({ place, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const places = usePlaces()

    const isPinned = isFavorite(places, place.id)
    const label = t(isPinned ? 'unpinCity' : 'pinCity', { name: getCityName(place, locale) })
    const star = <FavoriteStar isPinned={isPinned} size={STAR_SIZE} tone="default" />

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
            className={cn('h-auto min-w-0 bg-transparent px-0', className)}
        >
            {star}
        </Toggle>
    )
}
