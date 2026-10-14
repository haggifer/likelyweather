import { useStarters } from '@fa/hooks/useStarters'
import { DEFAULT_PLACES, getPlaceChips, getStarterPlaces } from '@fa/shared/places'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { useTranslations } from 'use-intl'
import { CityOverview } from '../components/home/CityOverview'
import { OverviewCardSkeleton } from '../components/home/OverviewCard'
import { PlaceChips } from '../components/home/PlaceChips'
import { SearchBox } from '../components/home/SearchBox'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { usePlaces } from '../hooks/usePlaces'
import { useSelectedCity } from '../hooks/useSelectedCity'
import { placesStore } from '../lib/places-store'
import { setSelectedCity } from '../lib/selected-city-store'

// The landing page on a phone without the web's hero, which an installed app has no need to pitch: search, the
// viewer's chips and the selected city's ten-day overview. Picking a city switches the overview in place, as on the
// web (`?city=`); a link can still name one with `?city=`.
export function HomeScreen() {
    const t = useTranslations('overview')
    const places = usePlaces()
    const selected = useSelectedCity()
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
            className="bg-background"
            contentContainerClassName="gap-4 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
        >
            <SearchBox onSelectCity={setSelectedCity} isLocateShown />
            <PlaceChips chips={chips} slug={slug} onSelect={setSelectedCity} />
            {slug ? <CityOverview key={slug} slug={slug} /> : <OverviewCardSkeleton status={t('loading')} />}
        </ScreenScroll>
    )
}
