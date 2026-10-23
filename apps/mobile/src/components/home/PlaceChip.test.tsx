import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_PLACES, Place } from '@fa/shared/places'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { createTranslator, IntlProvider } from 'use-intl'
import { placesStore } from '../../lib/places-store'
import { PlaceChip } from './PlaceChip'

const t = createTranslator({ locale: 'en', messages: en, namespace: 'city' })

const PLACE: Place = { id: 7, slug: 'city-7', name: 'Lviv', country: 'Ukraine', countryCode: 'UA' }

describe('PlaceChip', () => {
    afterAll(() => placesStore.set(() => DEFAULT_PLACES))

    it('opens its city on a tap and only shows the star, leaving a pinned place pinned', async () => {
        const onSelect = jest.fn()
        placesStore.set(() => ({ favorites: [PLACE], recents: [] }))

        await render(
            <IntlProvider locale="en" messages={en}>
                <PlaceChip place={PLACE} isSelected={false} onSelect={onSelect} />
            </IntlProvider>,
        )
        await fireEvent.press(screen.getByRole('button', { name: /Lviv/ }))

        expect(onSelect).toHaveBeenCalledWith('city-7')
        expect(screen.queryByRole('switch', { name: t('unpinCity', { name: PLACE.name }) })).toBeNull()
        expect(placesStore.get().favorites).toEqual([PLACE])
    })
})
