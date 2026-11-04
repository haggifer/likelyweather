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

export function PlaceChips({ chips, slug, onSelect }: IProps) {
    const t = useTranslations('landing')

    return (
        // The web's role="group" named "Start with" for screen readers only.
        <View
            role="group"
            accessibilityLabel={t('seeds')}
            className="flex-row flex-wrap items-center justify-center gap-2"
        >
            {chips?.map((place) => (
                <PlaceChip key={place.id} place={place} isSelected={slug === place.slug} onSelect={onSelect} />
            ))}
            {/* As tall as a chip: its button and the pill's border, so the rows below don't move when the chips arrive. */}
            {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} className="h-[38px] w-24 rounded-full" />)}
        </View>
    )
}
