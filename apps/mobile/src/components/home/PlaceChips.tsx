import { MAX_PLACES, Place } from '@fa/shared/places'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Skeleton } from '../ui/skeleton'
import { PlaceChip } from './PlaceChip'

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

interface IProps {
    // Null while the first visit's starter cities are chosen.
    chips: Place[] | null
    slug: string | null
    onSelect: (slug: string) => void
}

// The viewer's places under the search, on Home and on the Archive screen, as the web's PlaceChips.
export function PlaceChips({ chips, slug, onSelect }: IProps) {
    const t = useTranslations('landing')

    return (
        // The web's role="group" named "Start with" for screen readers only (author, 2026-10-14).
        <View
            role="group"
            accessibilityLabel={t('seeds')}
            className="flex-row flex-wrap items-center justify-center gap-2"
        >
            {chips?.map((place) => (
                <PlaceChip key={place.id} place={place} isSelected={slug === place.slug} onSelect={onSelect} />
            ))}
            {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </View>
    )
}
