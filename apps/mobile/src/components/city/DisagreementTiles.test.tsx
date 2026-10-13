import en from '@fa/messages/catalogs/en.json'
import { Variable } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { DisagreementTiles } from './DisagreementTiles'

const renderTiles = (days: Parameters<typeof DisagreementTiles>[0]['days']) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <DisagreementTiles days={days} variable={Variable.Pressure} />
        </IntlProvider>,
    )

describe('DisagreementTiles', () => {
    it('labels each day and keeps the tenths of a whole-number spread', async () => {
        await renderTiles([
            { day: '2026-10-09', spread: 1, label: 'agree' },
            { day: '2026-10-10', spread: 6, label: 'split' },
        ])

        expect(screen.getByText(en.disagreement.agree)).toBeOnTheScreen()
        expect(screen.getByText(en.disagreement.split)).toBeOnTheScreen()
        expect(screen.getByText(/^1\.0/)).toBeOnTheScreen()
    })

    it('says so when no day has two models', async () => {
        await renderTiles([])

        expect(screen.getByText(en.disagreement.empty)).toBeOnTheScreen()
    })
})
