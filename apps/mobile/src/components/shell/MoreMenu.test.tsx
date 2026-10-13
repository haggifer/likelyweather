import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { IntlProvider } from 'use-intl'
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
        </IntlProvider>,
    )
    await fireEvent.press(screen.getByRole('button', { name: en.nav.more }))
}

describe('MoreMenu', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // The menu opens where the layout puts its button; the test renderer has no layout to measure.
        jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((callback) => callback(300, 40, 36, 36))
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
        expect(screen.queryByRole('menu')).toBeNull()
    })

    it('pushes the other pages', async () => {
        await openMenu()
        await fireEvent.press(screen.getByRole('menuitem', { name: en.nav.archive }))

        expect(mockPush).toHaveBeenCalledWith('/archive')
    })
})
