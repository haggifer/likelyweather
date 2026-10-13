import en from '@fa/messages/catalogs/en.json'
import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { createTranslator, IntlProvider } from 'use-intl'
import { dismissSnackbar, getSnackbar } from '../../lib/snackbar-store'
import { RefreshButton } from './RefreshButton'

// sonner-native ships ESM that Jest does not transform; the snackbar store's own state is all these tests read.
jest.mock('sonner-native', () => ({ toast: { custom: jest.fn(), dismiss: jest.fn() } }))

const t = createTranslator({ locale: 'en', messages: en, namespace: 'city' })

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
        expect(getSnackbar()?.message).toBe(t('upToDate', { hours: REFRESH_AFTER_HOURS }))
    })

    it('refreshes when offered and keeps its name without the label', async () => {
        const onRefresh = jest.fn()

        await renderInEnglish(<RefreshButton isAvailable isFetching={false} onRefresh={onRefresh} isIconOnly />)
        await fireEvent.press(screen.getByRole('button', { name: en.city.refresh }))

        expect(screen.queryByText(en.city.refresh)).toBeNull()
        expect(onRefresh).toHaveBeenCalled()
    })
})
