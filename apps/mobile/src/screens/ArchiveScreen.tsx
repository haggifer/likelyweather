import { getPlaceChips } from '@fa/shared/places'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'
import { useTranslations } from 'use-intl'
import { ArchiveCard } from '../components/archive/ArchiveCard'
import { PlaceChips } from '../components/home/PlaceChips'
import { SearchBox } from '../components/home/SearchBox'
import { Card } from '../components/legacy-ui/Card'
import { LoadingStatus } from '../components/ui/LoadingStatus'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { usePlaces } from '../hooks/usePlaces'
import { useTheme } from '../hooks/useTheme'

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
})

// The web's archive page: the same search and chips as Home, then the chosen city's past weather. The city is the
// screen's `city` param, as the web keeps it in `?city=`, and the first chip until one is picked.
export function ArchiveScreen() {
    const t = useTranslations('overview')
    const router = useRouter()
    const places = usePlaces()
    const { colors } = useTheme()
    const params = useLocalSearchParams<{ city?: string }>()

    const chips = getPlaceChips(places)
    const slug = params.city ?? chips[0]?.slug ?? null

    const handleSelect = (next: string) => router.setParams({ city: next })

    return (
        <ScreenScroll
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor: colors.background }}
        >
            <SearchBox onSelectCity={handleSelect} />
            <PlaceChips chips={chips} slug={slug} onSelect={handleSelect} />
            {slug ? (
                <ArchiveCard key={slug} slug={slug} />
            ) : (
                <Card>
                    <LoadingStatus label={t('loading')} />
                </Card>
            )}
        </ScreenScroll>
    )
}
