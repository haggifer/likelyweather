import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { createTranslator, IntlProvider } from 'use-intl'
import { dismissSnackbar, getSnackbar } from '../../lib/snackbar-store'
import { UpdatedChip } from './UpdatedChip'

// sonner-native ships ESM that Jest does not transform; the snackbar store's own state is all these tests read.
jest.mock('sonner-native', () => ({ toast: { custom: jest.fn(), dismiss: jest.fn() } }))

const NOW = new Date('2026-10-09T12:00:00Z')
const AGE = createTranslator({ locale: 'en', messages: en, namespace: 'city' })('forecastAge', { hours: 5 })

const renderInEnglish = (element: ReactElement) =>
    render(
        <IntlProvider locale="en" messages={en} timeZone="UTC">
            {element}
        </IntlProvider>,
    )

describe('UpdatedChip', () => {
    afterEach(() => dismissSnackbar())

    it('shows the run times in the snackbar when tapped', async () => {
        await renderInEnglish(
            <UpdatedChip
                fetchedAt="2026-10-09T07:00:00Z"
                issueTime="2026-10-09T00:00:00Z"
                timeZone="Europe/Kyiv"
                now={NOW}
            />,
        )

        await fireEvent.press(screen.getByRole('button', { name: AGE }))

        expect(getSnackbar()?.message).toContain('00:00 UTC')
    })

    it('turns into an icon that tells its age in the snackbar', async () => {
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

        expect(getSnackbar()?.message).toMatch(new RegExp(`^${AGE}\\. .*00:00 UTC`))
    })

    it('stays hidden while the data is fresh', async () => {
        await renderInEnglish(<UpdatedChip fetchedAt="2026-10-09T11:00:00Z" now={NOW} />)

        expect(screen.toJSON()).toBeNull()
    })
})
