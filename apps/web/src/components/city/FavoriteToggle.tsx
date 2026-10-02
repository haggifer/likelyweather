'use client'

import { usePlaces } from '@/hooks/usePlaces'
import { isFavorite, isPinnable, MAX_PLACES, Place, togglePlace } from '@/lib/places'
import { updatePlaces } from '@/lib/places-store'
import { Button } from '@fa/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { cn } from '@fa/ui/lib/cn'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    place: Place
    className?: string
}

// Pins a place to the front of the viewer's chips. It stays invisible until the stored places are read, so the
// server HTML and the first render agree and the header doesn't shift.
export function FavoriteToggle({ place, className }: IProps) {
    const t = useTranslations('city')
    const places = usePlaces()

    const isPinned = places ? isFavorite(places, place.id) : false
    const isAvailable = places ? isPinnable(places, place.id) : true
    const label = t(isPinned ? 'unpin' : 'pin')

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
            className={cn('shrink-0', !places && 'invisible', className)}
        >
            <Star className={cn('size-5', isPinned ? 'fill-favorite text-favorite' : 'text-muted-foreground')} />
        </Button>
    )

    if (isAvailable) return button

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* A disabled button gets no pointer events, so the tooltip hangs on a focusable wrapper. */}
                <span
                    tabIndex={0}
                    className="inline-flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {button}
                </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64">
                {t('pinLimit', { max: MAX_PLACES })}
            </TooltipContent>
        </Tooltip>
    )
}
