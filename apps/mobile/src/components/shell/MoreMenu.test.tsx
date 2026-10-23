import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_PLACES, getDefaultPlace } from '@fa/shared/places'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { IntlProvider } from 'use-intl'
import { setSelectedCity } from '../../lib/selected-city-store'
import { MoreMenu } from './MoreMenu'

const mockPush = jest.fn()
const mockDismissTo = jest.fn()
let mockPathname = '/archive'

jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, dismissTo: mockDismissTo }),
    usePathname: () => mockPathname,
}))

const openMenu = async () => {
    await render(
        <IntlProvider locale="en" messages={en}>
            <MoreMenu />
            <PortalHost />
        </IntlProvider>,
    )
    await fireEvent.press(screen.getByRole('button', { name: en.nav.more }))
}

describe('MoreMenu', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // The menu opens where the layout puts its button; the test renderer has no layout to measure.
        jest.spyOn(View.prototype, 'measure').mockImplementation((callback) => callback(0, 0, 36, 36, 300, 40))
    })

    it('lists Forecast first and goes back to Home instead of stacking another one', async () => {
        mockPathname = '/archive'
        await openMenu()

        const items = screen.getAllByRole('menuitem')

        expect(items[0]).toHaveTextContent(en.nav.forecast)

        await fireEvent.press(items[0])

        expect(mockDismissTo).toHaveBeenCalledWith('/')
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('only closes on Home itself', async () => {
        mockPathname = '/'
        await openMenu()
        await fireEvent.press(screen.getByRole('menuitem', { name: en.nav.forecast }))

        expect(mockDismissTo).not.toHaveBeenCalled()
        expect(screen.queryByRole('menuitem')).toBeNull()
    })

    it('pushes the other pages, Settings among them', async () => {
        await openMenu()

        expect(screen.getByRole('menuitem', { name: en.mobile.settings })).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('menuitem', { name: en.nav.archive }))

        expect(mockPush).toHaveBeenCalledWith('/archive')
    })

    // The selected city lives for the session, so the default place is checked before a city is picked.
    it('opens the details of the overview default place before a city is picked', async () => {
        mockPathname = '/'
        await openMenu()
        await fireEvent.press(screen.getByRole('menuitem', { name: en.nav.details }))

        expect(mockPush).toHaveBeenCalledWith(`/city/${getDefaultPlace(DEFAULT_PLACES)!.slug}`)
    })

    it('opens the details of the city the overview shows', async () => {
        setSelectedCity('kyiv-ua-703448')
        mockPathname = '/'
        await openMenu()
        await fireEvent.press(screen.getByRole('menuitem', { name: en.nav.details }))

        expect(mockPush).toHaveBeenCalledWith('/city/kyiv-ua-703448')
    })
})
