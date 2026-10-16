import en from '@fa/messages/catalogs/en.json'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { View } from 'react-native'
import { createTranslator, IntlProvider } from 'use-intl'
import { UpdatedChip } from './UpdatedChip'

const NOW = new Date('2026-10-09T12:00:00Z')
const AGE = createTranslator({ locale: 'en', messages: en, namespace: 'city' })('forecastAge', { hours: 5 })

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

describe('UpdatedChip', () => {
    afterEach(() => jest.restoreAllMocks())

    it('shows the run times in a hint when tapped', async () => {
        await renderInEnglish(
            <UpdatedChip
                fetchedAt="2026-10-09T07:00:00Z"
                issueTime="2026-10-09T00:00:00Z"
                timeZone="Europe/Kyiv"
                now={NOW}
            />,
        )

        await fireEvent.press(screen.getByRole('button', { name: AGE }))

        expect(screen.getByText(/00:00 UTC/)).toBeOnTheScreen()
    })

    it('turns into an icon that tells only its age in a hint', async () => {
        await renderInEnglish(
            <UpdatedChip
                fetchedAt="2026-10-09T07:00:00Z"
                issueTime="2026-10-09T00:00:00Z"
                timeZone="Europe/Kyiv"
                now={NOW}
                isCompact
            />,
        )

        expect(screen.queryByText(AGE)).toBeNull()

        await fireEvent.press(screen.getByRole('button', { name: AGE }))

        expect(screen.getByText(AGE)).toBeOnTheScreen()
    })

    it('stays hidden while the data is fresh', async () => {
        await renderInEnglish(<UpdatedChip fetchedAt="2026-10-09T11:00:00Z" now={NOW} />)

        expect(screen.toJSON()).toBeNull()
    })
})
