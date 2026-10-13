import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_PLACES, MAX_PLACES, Place } from '@fa/shared/places'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { createTranslator, IntlProvider } from 'use-intl'
import { placesStore } from '../../lib/places-store'
import { dismissSnackbar, getSnackbar } from '../../lib/snackbar-store'
import { FavoriteToggle } from './FavoriteToggle'

// sonner-native ships ESM that Jest does not transform; the snackbar store's own state is all these tests read.
jest.mock('sonner-native', () => ({ toast: { custom: jest.fn(), dismiss: jest.fn() } }))

const t = createTranslator({ locale: 'en', messages: en, namespace: 'city' })

const toPlace = (i: number): Place => ({
    id: i,
    slug: `city-${i}`,
    name: `City ${i}`,
    country: 'Ukraine',
    countryCode: 'UA',
})

const PLACE = toPlace(100)

const renderToggle = () =>
    render(
        <IntlProvider locale="en" messages={en}>
            <FavoriteToggle place={PLACE} />
        </IntlProvider>,
    )

describe('FavoriteToggle', () => {
    afterEach(() => dismissSnackbar())

    afterAll(() => placesStore.set(() => DEFAULT_PLACES))

    it('pins the place and unpins it again', async () => {
        placesStore.set(() => ({ favorites: [], recents: [] }))

        await renderToggle()
        await fireEvent.press(screen.getByRole('switch', { name: t('pinCity', { name: PLACE.name }) }))

        const star = screen.getByRole('switch', { name: t('unpinCity', { name: PLACE.name }) })

        expect(star).toBeChecked()
        expect(placesStore.get().favorites.map((p) => p.id)).toEqual([PLACE.id])

        await fireEvent.press(star)

        expect(placesStore.get().favorites).toEqual([])
    })

    it('explains the limit instead of pinning a fifth place', async () => {
        placesStore.set(() => ({ favorites: Array.from({ length: MAX_PLACES }, (_, i) => toPlace(i)), recents: [] }))

        await renderToggle()
        await fireEvent.press(screen.getByRole('switch', { name: t('pinCity', { name: PLACE.name }) }))

        expect(getSnackbar()?.message).toBe(t('pinLimit', { max: MAX_PLACES }))
        expect(placesStore.get().favorites).toHaveLength(MAX_PLACES)
    })
})
