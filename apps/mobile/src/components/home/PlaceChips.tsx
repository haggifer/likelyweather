import { MAX_PLACES, Place } from '@fa/shared/places'
import { StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Skeleton } from '../legacy-ui/Skeleton'
import { Text } from '../legacy-ui/Text'
import { PlaceChip } from './PlaceChip'

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

const styles = StyleSheet.create({
    label: { fontSize: 12, fontWeight: '500' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' },
})

interface IProps {
    // Null while the first visit's starter cities are chosen.
    chips: Place[] | null
    slug: string | null
    onSelect: (slug: string) => void
}

// The viewer's places under the search, on Home and on the Archive screen, as the web's PlaceChips.
export function PlaceChips({ chips, slug, onSelect }: IProps) {
    const t = useTranslations('landing')
    const { colors } = useTheme()

    return (
        // The web's role="group" named "Start with"; the visible label is left out so TalkBack reads it once.
        <View style={styles.chips} role="group" accessibilityLabel={t('seeds')}>
            <Text
                style={[styles.label, { color: colors['muted-foreground'] }]}
                importantForAccessibility="no"
                accessibilityElementsHidden
            >
                {t('seeds')}
            </Text>
            {chips?.map((place) => (
                <PlaceChip key={place.id} place={place} isSelected={slug === place.slug} onSelect={onSelect} />
            ))}
            {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} height={36} width={96} radius={999} />)}
        </View>
    )
}
