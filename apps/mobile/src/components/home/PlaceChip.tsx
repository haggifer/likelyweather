import { getCityName } from '@fa/shared/format'
import { Place } from '@fa/shared/places'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocale } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { getFlagEmoji } from '../../lib/flag'
import { FavoriteToggle } from '../city/FavoriteToggle'

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingLeft: 12,
        paddingRight: 10,
        minHeight: 36,
    },
    name: { fontSize: 13, fontWeight: '500', flexShrink: 0 },
})

interface IProps {
    place: Place
    isSelected: boolean
    onSelect: (slug: string) => void
}

// The city and its star are two targets in one pill.
export function PlaceChip({ place, isSelected, onSelect }: IProps) {
    const locale = useLocale()
    const { colors } = useTheme()

    const name = getCityName(place, locale)

    return (
        <View
            style={[
                styles.chip,
                {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                },
            ]}
        >
            <Pressable
                onPress={() => onSelect(place.slug)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                hitSlop={{ top: 6, bottom: 6 }}
            >
                <Text
                    numberOfLines={1}
                    style={[styles.name, { color: isSelected ? colors['primary-foreground'] : colors.foreground }]}
                >
                    {getFlagEmoji(place.countryCode)} {name}
                </Text>
            </Pressable>
            <FavoriteToggle place={place} size={16} tone={isSelected ? 'inverse' : 'default'} />
        </View>
    )
}
