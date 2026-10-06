import en from '@fa/messages/catalogs/en.json'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { HomeScreen } from './HomeScreen'

describe('HomeScreen', () => {
    it('shows the landing hero from the shared catalog', async () => {
        await render(
            <IntlProvider locale="en" messages={en}>
                <HomeScreen />
            </IntlProvider>,
        )

        expect(screen.getByText(en.landing.hero)).toBeOnTheScreen()
        expect(screen.getByText(en.landing.sub)).toBeOnTheScreen()
    })
})
