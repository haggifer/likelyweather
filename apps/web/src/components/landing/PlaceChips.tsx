'use client'

import { PlaceChip } from '@/components/landing/PlaceChip'
import { Skeleton } from '@/components/ui/skeleton'
import { isFavorite, MAX_PLACES, Place, Places } from '@fa/shared/places'
import { useTranslations } from 'next-intl'

interface IProps {
    places: Places | null
    chips: Place[] | null
    slug: string | null
    onSelect: (slug: string) => void
}

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

// The viewer's places as one-tap shortcuts, on the landing page and the archive alike; placeholders hold their room
// while the places are read or chosen.
export function PlaceChips({ places, chips, slug, onSelect }: IProps) {
    const t = useTranslations('landing')

    return (
        <div role="group" aria-label={t('seeds')} className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground max-sm:hidden" aria-hidden="true">
                {t('seeds')}
            </span>
            {chips?.map((place) => (
                <PlaceChip
                    key={place.id}
                    place={place}
                    isSelected={slug === place.slug}
                    isPinned={Boolean(places && isFavorite(places, place.id))}
                    onSelect={onSelect}
                />
            ))}
            {!chips &&
                CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} className="h-7 w-24 rounded-full pointer-coarse:h-9" />)}
        </div>
    )
}
