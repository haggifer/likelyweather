import { getPlaceChips } from '@fa/shared/places'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslations } from 'use-intl'
import { ArchiveCard } from '../components/archive/ArchiveCard'
import { PlaceChips } from '../components/home/PlaceChips'
import { SearchBox } from '../components/home/SearchBox'
import { Card, CardContent } from '../components/ui/card'
import { LoadingStatus } from '../components/ui/LoadingStatus'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { usePlaces } from '../hooks/usePlaces'

// The web's archive page: the same search and chips as Home, then the chosen city's past weather. The city is the
// screen's `city` param, as the web keeps it in `?city=`, and the first chip until one is picked.
export function ArchiveScreen() {
    const t = useTranslations('overview')
    const router = useRouter()
    const places = usePlaces()
    const params = useLocalSearchParams<{ city?: string }>()

    const chips = getPlaceChips(places)
    const slug = params.city ?? chips[0]?.slug ?? null

    const handleSelect = (next: string) => router.setParams({ city: next })

    return (
        <ScreenScroll
            contentContainerClassName="gap-4 p-4"
            keyboardShouldPersistTaps="handled"
            className="bg-background"
        >
            <SearchBox onSelectCity={handleSelect} />
            <PlaceChips chips={chips} slug={slug} onSelect={handleSelect} />
            {slug ? (
                <ArchiveCard key={slug} slug={slug} />
            ) : (
                <Card className="py-4">
                    <CardContent>
                        <LoadingStatus label={t('loading')} />
                    </CardContent>
                </Card>
            )}
        </ScreenScroll>
    )
}
