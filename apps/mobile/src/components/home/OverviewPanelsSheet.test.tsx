import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_OVERVIEW_PANELS } from '@fa/shared/overview-panels'
import { Variable } from '@fa/shared/variables'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { settingsStore } from '../../lib/settings'
import { OverviewPanelsSheet } from './OverviewPanelsSheet'

const BoundSheet = () => {
    const { panels, setPanels } = useOverviewPanels()

    return <OverviewPanelsSheet panels={panels} onChange={setPanels} isOpen onClose={jest.fn()} />
}

const renderSheet = () =>
    render(
        <IntlProvider locale="en" messages={en}>
            <BoundSheet />
        </IntlProvider>,
    )

describe('OverviewPanelsSheet', () => {
    beforeEach(() => settingsStore.set((settings) => ({ ...settings, overviewPanels: DEFAULT_OVERVIEW_PANELS })))

    it('shows humidity and moves it up, keeping the choice in the settings', async () => {
        await renderSheet()

        const humidity = screen.getByRole('checkbox', { name: en.variables.humidity })

        expect(humidity).not.toBeChecked()

        await fireEvent.press(humidity)
        await fireEvent.press(screen.getByRole('button', { name: 'Move Humidity up' }))

        expect(screen.getByRole('checkbox', { name: en.variables.humidity })).toBeChecked()
        expect(settingsStore.get().overviewPanels).toEqual({
            order: [
                Variable.Temp,
                Variable.Wind,
                Variable.Pressure,
                Variable.Humidity,
                Variable.Precip,
                Variable.Cloud,
            ],
            hidden: [Variable.Cloud],
        })
    })

    it('keeps the last shown panel and restores the default on Reset', async () => {
        settingsStore.set((settings) => ({
            ...settings,
            overviewPanels: { ...DEFAULT_OVERVIEW_PANELS, hidden: DEFAULT_OVERVIEW_PANELS.order.slice(1) },
        }))
        await renderSheet()

        expect(screen.getByRole('checkbox', { name: en.variables.temp })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Move Temperature up' })).toBeDisabled()

        await fireEvent.press(screen.getByRole('button', { name: en.overview.resetPanels }))

        expect(settingsStore.get().overviewPanels).toEqual(DEFAULT_OVERVIEW_PANELS)
    })
})
