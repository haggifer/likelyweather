import { describe, expect, it } from 'vitest'
import {
    DEFAULT_OVERVIEW_PANELS,
    getPanelDataVariables,
    getVisiblePanels,
    movePanel,
    movePanelTo,
    OverviewPanels,
    parseOverviewPanels,
    togglePanel,
} from './overview-panels'
import { Variable } from './variables'

const { Temp, Wind, Pressure, Precip, Humidity, Cloud, Feels, Gusts } = Variable

describe('parseOverviewPanels', () => {
    it('starts from the four classic panels, humidity and cloud cover hidden', () => {
        expect(parseOverviewPanels(null)).toEqual(DEFAULT_OVERVIEW_PANELS)
        expect(getVisiblePanels(DEFAULT_OVERVIEW_PANELS)).toEqual([Temp, Wind, Pressure, Precip])
    })

    it('keeps a stored order and appends panels it does not know as hidden', () => {
        const panels = parseOverviewPanels(JSON.stringify({ order: [Precip, Temp], hidden: [] }))

        expect(panels.order).toEqual([Precip, Temp, Wind, Pressure, Humidity, Cloud])
        expect(getVisiblePanels(panels)).toEqual([Precip, Temp])
    })

    it('drops unknown, repeated and second-line ids, and repairs broken JSON', () => {
        const panels = parseOverviewPanels(JSON.stringify({ order: [Wind, 'snow', Wind, Feels], hidden: [Gusts] }))

        expect(panels.order).toEqual([Wind, Temp, Pressure, Precip, Humidity, Cloud])
        expect(parseOverviewPanels('{oops')).toEqual(DEFAULT_OVERVIEW_PANELS)
    })

    it('never leaves every panel hidden', () => {
        const panels = parseOverviewPanels(JSON.stringify({ order: [Temp], hidden: [Temp, Wind, Pressure, Precip] }))

        expect(getVisiblePanels(panels)).toEqual([Temp])
    })
})

describe('movePanel', () => {
    it('swaps a panel with its neighbour and stops at the ends', () => {
        expect(movePanel(DEFAULT_OVERVIEW_PANELS, Wind, -1).order.slice(0, 2)).toEqual([Wind, Temp])
        expect(movePanel(DEFAULT_OVERVIEW_PANELS, Temp, -1)).toBe(DEFAULT_OVERVIEW_PANELS)
        expect(movePanel(DEFAULT_OVERVIEW_PANELS, Cloud, 1)).toBe(DEFAULT_OVERVIEW_PANELS)
    })
})

describe('movePanelTo', () => {
    it('drops a panel at the index and shifts the ones between', () => {
        expect(movePanelTo(DEFAULT_OVERVIEW_PANELS, Temp, 3).order.slice(0, 4)).toEqual([Wind, Pressure, Precip, Temp])
        expect(movePanelTo(DEFAULT_OVERVIEW_PANELS, Cloud, 0).order[0]).toBe(Cloud)
        expect(movePanelTo(DEFAULT_OVERVIEW_PANELS, Temp, 0)).toBe(DEFAULT_OVERVIEW_PANELS)
        expect(movePanelTo(DEFAULT_OVERVIEW_PANELS, Temp, 6)).toBe(DEFAULT_OVERVIEW_PANELS)
    })
})

describe('togglePanel', () => {
    it('shows a hidden panel and hides a shown one', () => {
        expect(getVisiblePanels(togglePanel(DEFAULT_OVERVIEW_PANELS, Humidity))).toContain(Humidity)
        expect(getVisiblePanels(togglePanel(DEFAULT_OVERVIEW_PANELS, Wind))).not.toContain(Wind)
    })

    it('keeps the last shown panel', () => {
        const onlyTemp: OverviewPanels = {
            order: DEFAULT_OVERVIEW_PANELS.order,
            hidden: [Wind, Pressure, Precip, Humidity, Cloud],
        }

        expect(togglePanel(onlyTemp, Temp)).toBe(onlyTemp)
    })
})

describe('getPanelDataVariables', () => {
    it('adds the second lines a panel draws', () => {
        expect(getPanelDataVariables([Temp, Humidity, Wind])).toEqual([Temp, Feels, Humidity, Wind, Gusts])
    })
})
