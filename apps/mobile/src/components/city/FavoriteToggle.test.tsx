import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_PLACES, MAX_PLACES, Place } from '@fa/shared/places'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { createTranslator, IntlProvider } from 'use-intl'
import { placesStore } from '../../lib/places-store'
import { FavoriteToggle } from './FavoriteToggle'

const t = createTranslator({ locale: 'en', messages: en, namespace: 'city' })

const toPlace = (i: number): Place => ({
    id: i,
    slug: `city-${i}`,
    name: `City ${i}`,
    country: 'Ukraine',
    countryCode: 'UA',
})

const PLACE = toPlace(100)

// The hint opens where its trigger was measured; the test renderer measures nothing, so the trigger reports a box.
const renderToggle = async () => {
    jest.spyOn(View.prototype, 'measure').mockImplementation((callback) => callback(0, 0, 36, 36, 300, 100))

    await render(
        <IntlProvider locale="en" messages={en}>
            <FavoriteToggle place={PLACE} />
            <PortalHost />
        </IntlProvider>,
    )
}

describe('FavoriteToggle', () => {
    afterEach(() => jest.restoreAllMocks())

    afterAll(() => placesStore.set(() => DEFAULT_PLACES))

    it('pins the place and unpins it again', async () => {
        placesStore.set(() => ({ favorites: [], recents: [] }))

        await renderToggle()
        await fireEvent.press(screen.getByRole('button', { name: t('pinCity', { name: PLACE.name }) }))

        const star = screen.getByRole('button', { name: t('unpinCity', { name: PLACE.name }) })

        expect(star).not.toBeSelected()
        expect(placesStore.get().favorites.map((p) => p.id)).toEqual([PLACE.id])

        await fireEvent.press(star)

        expect(placesStore.get().favorites).toEqual([])
    })

    it('explains the limit in a hint instead of pinning a fifth place', async () => {
        placesStore.set(() => ({ favorites: Array.from({ length: MAX_PLACES }, (_, i) => toPlace(i)), recents: [] }))

        await renderToggle()
        await fireEvent.press(screen.getByRole('button', { name: t('pinCity', { name: PLACE.name }) }))

        expect(screen.getByText(t('pinLimit', { max: MAX_PLACES }))).toBeOnTheScreen()
        expect(placesStore.get().favorites).toHaveLength(MAX_PLACES)
    })
})
