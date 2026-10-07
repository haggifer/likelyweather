'use client'

import { FlagIcon } from '@/components/shell/FlagIcon'
import { updatePlaces } from '@/lib/places-store'
import { getCityName } from '@fa/shared/format'
import { Place, togglePlace } from '@fa/shared/places'
import { cn } from '@fa/ui/lib/cn'
import { Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-ring'

const getStarTone = (isPinned: boolean, isSelected: boolean) => {
    if (isPinned) return 'fill-favorite-fill text-favorite'

    return isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
}

interface IProps {
    place: Place
    isSelected: boolean
    isPinned: boolean
    onSelect: (slug: string) => void
}

// The city and its star are sibling buttons inside one pill: a button can't hold another.
export function PlaceChip({ place, isSelected, isPinned, onSelect }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const name = getCityName(place, locale)
    const starLabel = t(isPinned ? 'unpinCity' : 'pinCity', { name })

    const handleToggle = () => updatePlaces((current) => togglePlace(current, place))

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border bg-card text-[0.8125rem] font-medium transition-colors hover:border-primary',
                isSelected && 'border-primary bg-primary text-primary-foreground',
            )}
        >
            <button
                type="button"
                onClick={() => onSelect(place.slug)}
                aria-pressed={isSelected}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-l-full py-1 pr-1 pl-3 transition-colors',
                    FOCUS_RING,
                    !isSelected && 'hover:text-primary',
                )}
            >
                <FlagIcon countryCode={place.countryCode} />
                {name}
            </button>
            <button
                type="button"
                onClick={handleToggle}
                aria-pressed={isPinned}
                aria-label={starLabel}
                title={starLabel}
                className={cn('rounded-r-full py-1 pr-2.5 pl-1', FOCUS_RING)}
            >
                <Star className={cn('size-4', getStarTone(isPinned, isSelected))} aria-hidden="true" />
            </button>
        </span>
    )
}
