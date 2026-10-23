'use client'

import { FlagIcon } from '@/components/shell/FlagIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { updatePlaces } from '@/lib/places-store'
import { getCityName } from '@fa/shared/format'
import { Place, togglePlace } from '@fa/shared/places'
import { Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

// The two halves of the pill are ghost buttons without their own border, fill or height: the pill draws them.
const CHIP_PART =
    'h-7 rounded-none border-0 text-[0.8125rem] hover:bg-transparent max-sm:text-sm touch:h-9 dark:hover:bg-transparent'

const getStarTone = (isPinned: boolean, isSelected: boolean) => {
    if (isPinned) return 'fill-favorite-fill text-favorite'

    return isSelected ? 'text-primary-foreground/70' : 'text-favorite-idle'
}

interface IProps {
    place: Place
    isSelected: boolean
    isPinned: boolean
    onSelect: (slug: string) => void
}

// The city and its star are sibling buttons inside one pill: a button can't hold another. On phones the star is only
// shown, inside the city's button, so a tap meant for the city never pins it; the overview card's star pins.
export function PlaceChip({ place, isSelected, isPinned, onSelect }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const name = getCityName(place, locale)
    const starLabel = t(isPinned ? 'unpinCity' : 'pinCity', { name })
    const hoverText = isSelected ? 'hover:text-primary-foreground' : 'hover:text-primary'

    const handleToggle = () => updatePlaces((current) => togglePlace(current, place))

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border bg-card text-[0.8125rem] font-medium transition-colors hover:border-primary',
                isSelected && 'border-primary bg-primary text-primary-foreground',
            )}
        >
            <Button
                type="button"
                variant="ghost"
                onClick={() => onSelect(place.slug)}
                aria-pressed={isSelected}
                className={cn(CHIP_PART, 'gap-1.5 rounded-l-full pr-1 pl-3 max-sm:pr-3', hoverText)}
            >
                <FlagIcon countryCode={place.countryCode} />
                {name}
                <Star className={cn('size-4 sm:hidden', getStarTone(isPinned, isSelected))} aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                onClick={handleToggle}
                aria-pressed={isPinned}
                aria-label={starLabel}
                title={starLabel}
                className={cn(CHIP_PART, 'rounded-r-full pr-2.5 pl-1 touch:min-w-9 max-sm:hidden', hoverText)}
            >
                <Star className={cn('size-4', getStarTone(isPinned, isSelected))} aria-hidden="true" />
            </Button>
        </span>
    )
}
