import en from '@fa/messages/catalogs/en.json'
import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { View } from 'react-native'
import { createTranslator, IntlProvider } from 'use-intl'
import { RefreshButton } from './RefreshButton'

const t = createTranslator({ locale: 'en', messages: en, namespace: 'city' })

// The hint opens where its trigger was measured; the test renderer measures nothing, so the trigger reports a box.
const renderInEnglish = async (element: ReactElement) => {
    jest.spyOn(View.prototype, 'measure').mockImplementation((callback) => callback(0, 0, 32, 32, 16, 100))

    await render(
        <IntlProvider locale="en" messages={en} timeZone="UTC">
            {element}
            <PortalHost />
        </IntlProvider>,
    )
}

describe('RefreshButton', () => {
    afterEach(() => jest.restoreAllMocks())

    it('keeps the name "Refresh" and says why it is disabled in a hint when tapped', async () => {
        const onRefresh = jest.fn()

        await renderInEnglish(<RefreshButton isAvailable={false} isFetching={false} onRefresh={onRefresh} />)
        await fireEvent.press(screen.getByRole('button', { name: en.city.refresh }))

        expect(onRefresh).not.toHaveBeenCalled()
        expect(screen.getByText(t('upToDate', { hours: REFRESH_AFTER_HOURS }))).toBeOnTheScreen()
    })

    it('refreshes when offered and keeps its name without the label', async () => {
        const onRefresh = jest.fn()

        await renderInEnglish(<RefreshButton isAvailable isFetching={false} onRefresh={onRefresh} isIconOnly />)
        await fireEvent.press(screen.getByRole('button', { name: en.city.refresh }))

        expect(screen.queryByText(en.city.refresh)).toBeNull()
        expect(onRefresh).toHaveBeenCalled()
    })
})
