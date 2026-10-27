import { apiGet, apiPost, ApiRequestError } from '@fa/api-client/api'
import { usePendingTrack } from '@fa/api-client/hooks/usePendingTrack'
import en from '@fa/messages/catalogs/en.json'
import { GeocodeResult, TrackResponse } from '@fa/shared/api'
import { DEFAULT_PLACES, Place } from '@fa/shared/places'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { IntlProvider } from 'use-intl'
import { placesStore } from '../../lib/places-store'
import { SearchBox } from './SearchBox'

jest.mock('@fa/api-client/api', () => ({
    ...jest.requireActual<object>('@fa/api-client/api'),
    apiGet: jest.fn(),
    apiPost: jest.fn(),
}))

const toPlace = (i: number): Place => ({
    id: 1000 + i,
    slug: `place-${i}`,
    name: `Place ${i}`,
    country: 'Ukraine',
    countryCode: 'UA',
})

const toResult = (name: string, id: number): GeocodeResult => ({
    id,
    name,
    country: 'France',
    countryCode: 'FR',
    lat: 48.85,
    lon: 2.35,
    timezone: 'Europe/Paris',
    population: id,
})

const toTracked = (result: GeocodeResult, slug: string): TrackResponse => ({ slug, city: { ...result, slug } })

// Stands for a screen's overview, which shows the place being stored as the picked one.
const PendingName = () => <Text>{`pending: ${usePendingTrack()?.name ?? 'none'}`}</Text>

const renderSearch = (onSelectCity = jest.fn(), initialQuery?: string) => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
    })

    return render(
        <QueryClientProvider client={client}>
            <IntlProvider locale="en" messages={en}>
                <SearchBox onSelectCity={onSelectCity} initialQuery={initialQuery} />
                <PendingName />
            </IntlProvider>
        </QueryClientProvider>,
    )
}

const getField = () => screen.getByLabelText(en.search.label)

const getRootStyle = () => {
    let element = screen.getByText(en.search.places).parent

    while (element && element.props.style?.marginBottom === undefined) element = element.parent

    return element?.props.style
}

describe('SearchBox', () => {
    beforeEach(() =>
        placesStore.set(() => ({ favorites: [], recents: Array.from({ length: 20 }, (_, i) => toPlace(i)) })),
    )

    afterEach(() => {
        jest.mocked(apiGet).mockReset()
        jest.mocked(apiPost).mockReset()
    })

    // After the last test has unmounted, so no mounted box re-renders outside act().
    afterAll(() => placesStore.set(() => DEFAULT_PLACES))

    it('lists every stored place, like the web, and the Search key picks the first', async () => {
        const onSelectCity = jest.fn()

        await renderSearch(onSelectCity)
        await fireEvent(getField(), 'focus')

        expect(screen.getByText('Place 0, Ukraine')).toBeOnTheScreen()
        expect(screen.getByText('Place 19, Ukraine')).toBeOnTheScreen()

        await fireEvent(getField(), 'submitEditing')

        expect(onSelectCity).toHaveBeenCalledWith('place-0')
    })

    it('holds the current name for a switcher and searches only once it is edited', async () => {
        jest.mocked(apiGet).mockResolvedValue({ results: [toResult('Paris', 1)] })

        await renderSearch(jest.fn(), 'Kyiv')
        await fireEvent(getField(), 'focus')

        expect(getField().props.value).toBe('Kyiv')
        expect(screen.getByText(en.search.places)).toBeOnTheScreen()
        expect(apiGet).not.toHaveBeenCalled()

        await fireEvent.changeText(getField(), 'Paris')
        await waitFor(() => expect(screen.getByText('Paris, France')).toBeOnTheScreen())
    })

    it('stores a picked result and opens it as the newest recent place', async () => {
        const onSelectCity = jest.fn()

        jest.mocked(apiGet).mockResolvedValue({ results: [toResult('Lyon', 2), toResult('Paris', 3)] })
        jest.mocked(apiPost).mockResolvedValue(toTracked(toResult('Paris', 3), 'paris-fr-3'))

        await renderSearch(onSelectCity)
        await fireEvent(getField(), 'focus')
        await fireEvent.changeText(getField(), 'Pa')

        expect(screen.getByText(en.search.hint)).toBeOnTheScreen()

        await fireEvent.changeText(getField(), 'Paris')
        await waitFor(() => expect(screen.getByText('Lyon, France')).toBeOnTheScreen())
        await fireEvent.press(screen.getByText('Paris, France'))

        await waitFor(() => expect(onSelectCity).toHaveBeenCalledWith('paris-fr-3'))
        expect(apiPost).toHaveBeenCalledWith('/cities/track', { geocodeId: 3 })
        expect(placesStore.get().recents[0]).toMatchObject({ id: 3, slug: 'paris-fr-3' })
    })

    it('folds the list at a pick and shows the place as pending until it is stored', async () => {
        const onSelectCity = jest.fn()
        let answer: (value: TrackResponse) => void = () => {}

        jest.mocked(apiGet).mockResolvedValue({ results: [toResult('Paris', 3)] })
        jest.mocked(apiPost).mockReturnValue(new Promise((resolve) => (answer = resolve)))

        await renderSearch(onSelectCity)
        await fireEvent(getField(), 'focus')
        await fireEvent.changeText(getField(), 'Paris')
        await waitFor(() => expect(screen.getByText('Paris, France')).toBeOnTheScreen())
        await fireEvent.press(screen.getByText('Paris, France'))

        expect(screen.queryByText('Paris, France')).toBeNull()
        await waitFor(() => expect(screen.getByText('pending: Paris')).toBeOnTheScreen())
        expect(onSelectCity).not.toHaveBeenCalled()

        answer(toTracked(toResult('Paris', 3), 'paris-fr-3'))

        await waitFor(() => expect(onSelectCity).toHaveBeenCalledWith('paris-fr-3'))
        expect(screen.getByText('pending: none')).toBeOnTheScreen()
    })

    // Android hands a drag only to views whose bounds hold it, so the list's own scroll needs the box to cover it.
    it('reaches over the open list without moving what follows', async () => {
        await renderSearch()
        await fireEvent(getField(), 'focus')
        await fireEvent(screen.getByText(en.search.places), 'layout', { nativeEvent: { layout: { height: 180 } } })

        expect(getRootStyle()).toEqual({ paddingBottom: 180, marginBottom: -180 })
    })

    it('closes the list when the field loses focus', async () => {
        await renderSearch()
        await fireEvent(getField(), 'focus')
        await fireEvent(getField(), 'blur')

        expect(screen.queryByText(en.search.places)).toBeNull()
    })

    it('keeps the previous results under the error line when a search fails', async () => {
        jest.mocked(apiGet).mockResolvedValueOnce({ results: [toResult('Paris', 1)] })
        jest.mocked(apiGet).mockRejectedValueOnce(new ApiRequestError(429, 'rate_limited', 'slow down'))

        await renderSearch()
        await fireEvent(getField(), 'focus')
        await fireEvent.changeText(getField(), 'Paris')
        await waitFor(() => expect(screen.getByText('Paris, France')).toBeOnTheScreen())

        await fireEvent.changeText(getField(), 'Parisx')
        await waitFor(() => expect(screen.getByText(en.errors.rateLimited)).toBeOnTheScreen())

        expect(screen.getByText('Paris, France')).toBeOnTheScreen()
    })
})
