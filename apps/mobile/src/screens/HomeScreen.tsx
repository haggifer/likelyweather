import { DEFAULT_PLACES, getPlaceChips, getStarterPlaces, MAX_PLACES } from '@fa/shared/places'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { CityOverview } from '../components/home/CityOverview'
import { OverviewCardSkeleton } from '../components/home/OverviewCard'
import { PlaceChip } from '../components/home/PlaceChip'
import { SearchBox } from '../components/home/SearchBox'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Skeleton } from '../components/ui/Skeleton'
import { Text } from '../components/ui/Text'
import { usePlaces } from '../hooks/usePlaces'
import { useSelectedCity } from '../hooks/useSelectedCity'
import { useStarters } from '../hooks/useStarters'
import { useTheme } from '../hooks/useTheme'
import { placesStore } from '../lib/places-store'
import { setSelectedCity } from '../lib/selected-city-store'

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    chipsLabel: { fontSize: 12, fontWeight: '500' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' },
})

// The landing page on a phone without the web's hero, which an installed app has no need to pitch: search, the
// viewer's chips and the selected city's ten-day overview. Picking a city switches the overview in place, as on the
// web (`?city=`); a link can still name one with `?city=`.
export function HomeScreen() {
    const t = useTranslations('landing')
    const to = useTranslations('overview')
    const places = usePlaces()
    const selected = useSelectedCity()
    const { colors } = useTheme()
    const params = useLocalSearchParams<{ city?: string }>()

    // Nothing stored yet reads back as the shared defaults object itself, which marks a first launch.
    const isFirstVisit = places === DEFAULT_PLACES
    const starters = useStarters(isFirstVisit)

    const isChoosingStarters = isFirstVisit && starters.isLoading
    const chips = isChoosingStarters ? null : getPlaceChips(places)
    const slug = selected ?? params.city ?? chips?.[0].slug ?? null

    useEffect(() => {
        if (isFirstVisit && starters.data?.items.length) placesStore.set(() => getStarterPlaces(starters.data.items))
    }, [isFirstVisit, starters.data])

    // A link naming a city wins over the one viewed last.
    useEffect(() => {
        if (params.city) setSelectedCity(params.city)
    }, [params.city])

    return (
        <ScreenScroll
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor: colors.background }}
        >
            <SearchBox onSelectCity={setSelectedCity} isLocateShown />
            {/* The web's role="group" named "Start with"; the visible label is left out so TalkBack reads it once. */}
            <View style={styles.chips} role="group" accessibilityLabel={t('seeds')}>
                <Text
                    style={[styles.chipsLabel, { color: colors['muted-foreground'] }]}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                >
                    {t('seeds')}
                </Text>
                {chips?.map((place) => (
                    <PlaceChip
                        key={place.id}
                        place={place}
                        isSelected={slug === place.slug}
                        onSelect={setSelectedCity}
                    />
                ))}
                {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} height={36} width={96} radius={999} />)}
            </View>
            {slug ? <CityOverview key={slug} slug={slug} /> : <OverviewCardSkeleton status={to('loading')} />}
        </ScreenScroll>
    )
}
