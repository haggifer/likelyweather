import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { IntlProvider } from 'use-intl'
import { dismissSnackbar, getSnackbar } from '../../lib/snackbar-store'
import { RefreshButton } from './RefreshButton'

const renderInEnglish = (element: ReactElement) =>
    render(
        <IntlProvider locale="en" messages={en} timeZone="UTC">
            {element}
        </IntlProvider>,
    )

describe('RefreshButton', () => {
    afterEach(() => dismissSnackbar())

    it('keeps the name "Refresh" and says why it is disabled when tapped', async () => {
        const onRefresh = jest.fn()

        await renderInEnglish(<RefreshButton isAvailable={false} isFetching={false} onRefresh={onRefresh} />)
        await fireEvent.press(screen.getByRole('button', { name: en.city.refresh }))

        expect(onRefresh).not.toHaveBeenCalled()
        expect(getSnackbar()?.message).toBe('Up to date: fetched less than 3 hours ago.')
    })
})
