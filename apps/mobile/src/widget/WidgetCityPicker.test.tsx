import en from '@fa/messages/catalogs/en.json'
import { Place } from '@fa/shared/places'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { placesStore } from '../lib/places-store'
import { WidgetCityPicker } from './WidgetCityPicker'

const KYIV: Place = { id: 703448, slug: 'kyiv-ua-703448', name: 'Kyiv', country: 'Ukraine', countryCode: 'UA' }
const PARIS: Place = { id: 2988507, slug: 'paris-fr-2988507', name: 'Paris', country: 'France', countryCode: 'FR' }

const renderPicker = (onPick: (place: Place) => Promise<void>) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <IntlProvider locale="en" messages={en}>
                <WidgetCityPicker onPick={onPick} />
            </IntlProvider>
        </QueryClientProvider>,
    )

describe('WidgetCityPicker', () => {
    it('shows only the search for a viewer without places', async () => {
        placesStore.set(() => ({ favorites: [], recents: [] }))

        await renderPicker(jest.fn())

        expect(screen.getByLabelText(en.search.label)).toBeOnTheScreen()
        expect(screen.queryByText(en.search.places)).toBeNull()
    })

    it('searches any place and lists the viewer’s places, favorites first', async () => {
        placesStore.set(() => ({ favorites: [PARIS], recents: [KYIV] }))

        await renderPicker(jest.fn())

        expect(screen.getByLabelText(en.search.label)).toBeOnTheScreen()
        expect(screen.getByText(en.search.places)).toBeOnTheScreen()

        const rows = screen.getAllByText(/^(Paris|Kyiv), /).map((row) => row.props.children)

        expect(rows[0]).toMatch(/^Paris/)
        expect(rows[1]).toMatch(/^Kyiv/)
    })

    it('hands a tapped place to the widget once', async () => {
        placesStore.set(() => ({ favorites: [], recents: [KYIV, PARIS] }))
        const onPick = jest.fn(async () => {})

        await renderPicker(onPick)
        fireEvent.press(screen.getByText(/^Paris, /))
        fireEvent.press(screen.getByText(/^Kyiv, /))

        await waitFor(() => expect(onPick).toHaveBeenCalledWith(PARIS))
        expect(onPick).toHaveBeenCalledTimes(1)
    })
})
