'use client'

import { Hint } from '@/components/shell/Hint'
import { Button } from '@/components/ui/button'
import { usePlaces } from '@/hooks/usePlaces'
import { cn } from '@/lib/cn'
import { updatePlaces } from '@/lib/places-store'
import { getCityName } from '@fa/shared/format'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@fa/shared/places'
import { Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    place: Place
    className?: string
}

// Pins a place to the front of the viewer's chips. It stays invisible until the stored places are read, so the
// server HTML and the first render agree and the header doesn't shift.
export function FavoriteToggle({ place, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const places = usePlaces()

    const isPinned = places ? isFavorite(places, place.id) : false
    const isAvailable = places ? isPinnable(places, place.id) : true
    const label = t(isPinned ? 'unpinCity' : 'pinCity', { name: getCityName(place, locale) })

    const handleToggle = () => updatePlaces((current) => togglePlace(current, place))

    const button = (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleToggle}
            disabled={!places || !isAvailable}
            aria-pressed={isPinned}
            aria-label={label}
            title={isAvailable ? label : undefined}
            className={cn('shrink-0 pointer-coarse:size-9', !places && 'invisible', className)}
        >
            <Star className={cn('size-5', isPinned ? 'fill-favorite-fill text-favorite' : 'text-favorite-idle')} />
        </Button>
    )

    if (isAvailable) return button

    return (
        <Hint content={t('pinLimit', { max: MAX_PLACES })} className="max-w-64">
            {/* A disabled button gets no pointer events, so the hint hangs on a focusable wrapper. */}
            <span
                tabIndex={0}
                className="inline-flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {button}
            </span>
        </Hint>
    )
}
