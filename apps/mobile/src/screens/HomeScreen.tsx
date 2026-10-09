import { DEFAULT_PLACES, getPlaceChips, getStarterPlaces, MAX_PLACES } from '@fa/shared/places'
import { Href, useLocalSearchParams, useRouter } from 'expo-router'
import { BookOpen, ChevronRight, Columns3, LucideIcon, Split } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { CityOverview } from '../components/home/CityOverview'
import { PlaceChip } from '../components/home/PlaceChip'
import { SearchBox } from '../components/home/SearchBox'
import { Card } from '../components/ui/Card'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Skeleton } from '../components/ui/Skeleton'
import { usePlaces } from '../hooks/usePlaces'
import { useStarters } from '../hooks/useStarters'
import { useTheme } from '../hooks/useTheme'
import { placesStore } from '../lib/places-store'

type TileKey = 'disagree' | 'compare' | 'method'

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    hero: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
    sub: { fontSize: 15, lineHeight: 21 },
    chipsLabel: { fontSize: 12, fontWeight: '500' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    tile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tileText: { flex: 1, gap: 2 },
    tileTitle: { fontSize: 15, fontWeight: '600' },
    tileBody: { fontSize: 13, lineHeight: 18 },
})

const getTiles = (slug: string): { key: TileKey; icon: LucideIcon; href: Href }[] => [
    { key: 'disagree', icon: Split, href: `/city/${slug}` },
    { key: 'compare', icon: Columns3, href: '/compare' },
    { key: 'method', icon: BookOpen, href: '/methodology' },
]

// The landing page on a phone: search, the viewer's chips, the selected city's 72-hour overview and the three
// explanation tiles. Picking a city switches the overview in place, as on the web (`?city=`).
export function HomeScreen() {
    const t = useTranslations('landing')
    const router = useRouter()
    const places = usePlaces()
    const { colors } = useTheme()
    const params = useLocalSearchParams<{ city?: string }>()

    // Nothing stored yet reads back as the shared defaults object itself, which marks a first launch.
    const isFirstVisit = places === DEFAULT_PLACES
    const starters = useStarters(isFirstVisit)

    const isChoosingStarters = isFirstVisit && starters.isLoading
    const chips = isChoosingStarters ? null : getPlaceChips(places)
    const slug = params.city ?? chips?.[0].slug ?? null
    const tiles = getTiles(slug ?? DEFAULT_PLACES.recents[0].slug)

    const handleSelect = (next: string) => router.setParams({ city: next })

    useEffect(() => {
        if (isFirstVisit && starters.data?.items.length) placesStore.set(() => getStarterPlaces(starters.data.items))
    }, [isFirstVisit, starters.data])

    return (
        <ScreenScroll
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor: colors.background }}
        >
            <Text style={[styles.hero, { color: colors.foreground }]} accessibilityRole="header">
                {t('hero')}
            </Text>
            <Text style={[styles.sub, { color: colors['muted-foreground'] }]}>{t('sub')}</Text>
            <SearchBox onSelectCity={handleSelect} isLocateShown />
            <View style={styles.chips} accessibilityLabel={t('seeds')}>
                <Text style={[styles.chipsLabel, { color: colors['muted-foreground'] }]}>{t('seeds')}</Text>
                {chips?.map((place) => (
                    <PlaceChip key={place.id} place={place} isSelected={slug === place.slug} onSelect={handleSelect} />
                ))}
                {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} height={36} width={96} />)}
            </View>
            {slug ? <CityOverview key={slug} slug={slug} /> : <Skeleton height={520} />}
            {tiles.map(({ key, icon: Icon, href }) => (
                <Pressable key={key} onPress={() => router.push(href)} accessibilityRole="link">
                    <Card>
                        <View style={styles.tile}>
                            <Icon size={22} color={colors.primary} />
                            <View style={styles.tileText}>
                                <Text style={[styles.tileTitle, { color: colors.foreground }]}>
                                    {t(`tiles.${key}.title`)}
                                </Text>
                                <Text style={[styles.tileBody, { color: colors['muted-foreground'] }]}>
                                    {t(`tiles.${key}.body`)}
                                </Text>
                            </View>
                            <ChevronRight size={18} color={colors['muted-foreground']} />
                        </View>
                    </Card>
                </Pressable>
            ))}
        </ScreenScroll>
    )
}
