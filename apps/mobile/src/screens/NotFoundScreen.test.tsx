import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { NotFoundScreen } from './NotFoundScreen'

const mockDismissTo = jest.fn()

jest.mock('expo-router', () => ({ useRouter: () => ({ dismissTo: mockDismissTo }) }))

describe('NotFoundScreen', () => {
    it('explains the missing page in the app language and leads back to the start', async () => {
        await render(
            <IntlProvider locale="en" messages={en}>
                <NotFoundScreen />
            </IntlProvider>,
        )

        expect(screen.getByRole('heading', { name: en.notFound.title })).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: en.notFound.home }))

        expect(mockDismissTo).toHaveBeenCalledWith('/')
    })
})
