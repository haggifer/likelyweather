import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_OVERVIEW_PANELS } from '@fa/shared/overview-panels'
import { Variable } from '@fa/shared/variables'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { State } from 'react-native-gesture-handler'
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import { createTranslator, IntlProvider } from 'use-intl'
import { useOverviewPanels } from '../../hooks/useOverviewPanels'
import { settingsStore } from '../../lib/settings'
import { OverviewPanelsSheet } from './OverviewPanelsSheet'

const t = createTranslator({ locale: 'en', messages: en, namespace: 'overview' })

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

const getHandle = (name: string) => screen.getByLabelText(t('dragPanel', { name }))

describe('OverviewPanelsSheet', () => {
    beforeEach(() => settingsStore.set((settings) => ({ ...settings, overviewPanels: DEFAULT_OVERVIEW_PANELS })))

    it('shows and hides a panel with its eye', async () => {
        await renderSheet()

        await fireEvent.press(screen.getByRole('button', { name: t('showPanel', { name: en.variables.humidity }) }))

        expect(settingsStore.get().overviewPanels.hidden).toEqual([Variable.Cloud])

        await fireEvent.press(screen.getByRole('button', { name: t('hidePanel', { name: en.variables.wind }) }))

        expect(settingsStore.get().overviewPanels.hidden).toEqual([Variable.Cloud, Variable.Wind])
        expect(screen.getByRole('button', { name: t('showPanel', { name: en.variables.wind }) })).toBeEnabled()
    })

    it('keeps the last shown panel and restores the default on Reset', async () => {
        settingsStore.set((settings) => ({
            ...settings,
            overviewPanels: { ...DEFAULT_OVERVIEW_PANELS, hidden: DEFAULT_OVERVIEW_PANELS.order.slice(1) },
        }))
        await renderSheet()

        expect(screen.getByRole('button', { name: t('hidePanel', { name: en.variables.temp }) })).toBeDisabled()

        await fireEvent.press(screen.getByRole('button', { name: en.overview.resetPanels }))

        expect(settingsStore.get().overviewPanels).toEqual(DEFAULT_OVERVIEW_PANELS)
    })

    it('moves a panel with the screen reader actions, offering only the possible ones', async () => {
        await renderSheet()

        expect(getHandle(en.variables.temp).props.accessibilityActions).toEqual([
            { name: 'moveDown', label: t('moveDown', { name: en.variables.temp }) },
        ])

        await fireEvent(getHandle(en.variables.humidity), 'accessibilityAction', {
            nativeEvent: { actionName: 'moveUp' },
        })
        await fireEvent(getHandle(en.variables.temp), 'accessibilityAction', {
            nativeEvent: { actionName: 'moveDown' },
        })

        expect(settingsStore.get().overviewPanels.order).toEqual([
            Variable.Wind,
            Variable.Temp,
            Variable.Pressure,
            Variable.Humidity,
            Variable.Precip,
            Variable.Cloud,
        ])
        expect(getHandle(en.variables.cloud).props.accessibilityActions).toEqual([
            { name: 'moveUp', label: t('moveUp', { name: en.variables.cloud }) },
        ])
    })

    it('drops a dragged panel in the slot it is let go over', async () => {
        await renderSheet()

        // Cloud starts in the last of six 48 px rows; 190 px up leaves it nearest the second.
        await act(() =>
            fireGestureHandler(getByGestureTestId(`drag-${Variable.Cloud}`), [
                { state: State.BEGAN, translationY: 0 },
                { state: State.ACTIVE, translationY: -60 },
                { state: State.ACTIVE, translationY: -190 },
                { state: State.END, translationY: -190 },
            ]),
        )

        expect(settingsStore.get().overviewPanels.order).toEqual([
            Variable.Temp,
            Variable.Cloud,
            Variable.Wind,
            Variable.Pressure,
            Variable.Precip,
            Variable.Humidity,
        ])
    })
})
