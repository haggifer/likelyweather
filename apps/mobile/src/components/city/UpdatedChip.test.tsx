import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactElement } from 'react'
import { IntlProvider } from 'use-intl'
import { dismissSnackbar, getSnackbar } from '../../lib/snackbar-store'
import { UpdatedChip } from './UpdatedChip'

const NOW = new Date('2026-10-09T12:00:00Z')

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

        await fireEvent.press(screen.getByRole('button', { name: '5 hours old' }))

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

        expect(screen.queryByText('5 hours old')).toBeNull()

        await fireEvent.press(screen.getByRole('button', { name: '5 hours old' }))

        expect(getSnackbar()?.message).toMatch(/^5 hours old\. .*00:00 UTC/)
    })

    it('stays hidden while the data is fresh', async () => {
        await renderInEnglish(<UpdatedChip fetchedAt="2026-10-09T11:00:00Z" now={NOW} />)

        expect(screen.queryByText(/old/)).toBeNull()
    })
})
