import { MAX_PLACES, Place } from '@fa/shared/places'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Skeleton } from '../ui/skeleton'
import { Text } from '../ui/text'
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
        // The web's role="group" named "Start with"; the visible label is left out so TalkBack reads it once.
        <View
            role="group"
            accessibilityLabel={t('seeds')}
            className="flex-row flex-wrap items-center justify-center gap-2"
        >
            <Text
                className="text-xs font-medium text-muted-foreground"
                importantForAccessibility="no"
                accessibilityElementsHidden
            >
                {t('seeds')}
            </Text>
            {chips?.map((place) => (
                <PlaceChip key={place.id} place={place} isSelected={slug === place.slug} onSelect={onSelect} />
            ))}
            {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </View>
    )
}
