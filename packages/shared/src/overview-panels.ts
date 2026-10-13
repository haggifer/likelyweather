import { OverviewVariable, Variable } from './variables'

// A panel of the overview chart. Feels-like and gusts are not panels: they are drawn as second lines of temperature
// and wind (author, 2026-10-12).
export type PanelVariable =
    Variable.Temp | Variable.Wind | Variable.Pressure | Variable.Precip | Variable.Humidity | Variable.Cloud

// Which panels a reader shows and in which order, kept per device.
export interface OverviewPanels {
    order: PanelVariable[]
    hidden: PanelVariable[]
}

const PANEL_VARIABLES: PanelVariable[] = [
    Variable.Temp,
    Variable.Wind,
    Variable.Pressure,
    Variable.Precip,
    Variable.Humidity,
    Variable.Cloud,
]

export const DEFAULT_OVERVIEW_PANELS: OverviewPanels = {
    order: PANEL_VARIABLES,
    hidden: [Variable.Humidity, Variable.Cloud],
}

export const SECONDARY_VARIABLE: Partial<Record<PanelVariable, OverviewVariable>> = {
    [Variable.Temp]: Variable.Feels,
    [Variable.Wind]: Variable.Gusts,
}

const isPanelVariable = (value: unknown): value is PanelVariable => PANEL_VARIABLES.includes(value as PanelVariable)

const toPanelList = (value: unknown) =>
    Array.isArray(value) ? [...new Set(value.filter(isPanelVariable))] : ([] as PanelVariable[])

export const getVisiblePanels = ({ order, hidden }: OverviewPanels) => order.filter((v) => !hidden.includes(v))

// Repairs whatever is stored: unknown ids go, panels the stored order lacks (added in a later version) are appended
// hidden, so a new panel never appears unasked, and at least one panel stays shown.
export const normalizeOverviewPanels = (value: unknown): OverviewPanels => {
    if (!value || typeof value !== 'object') return DEFAULT_OVERVIEW_PANELS

    const stored = value as { order?: unknown; hidden?: unknown }
    const known = toPanelList(stored.order)
    const missing = PANEL_VARIABLES.filter((v) => !known.includes(v))
    const order = [...known, ...missing]
    const hidden = [...new Set([...toPanelList(stored.hidden), ...missing])]
    const panels = { order, hidden }

    return getVisiblePanels(panels).length ? panels : { order, hidden: hidden.filter((v) => v !== order[0]) }
}

export const parseOverviewPanels = (raw: string | null): OverviewPanels => {
    try {
        return normalizeOverviewPanels(JSON.parse(raw ?? 'null'))
    } catch {
        return DEFAULT_OVERVIEW_PANELS
    }
}

// A dragged panel lands at `to` and the panels between shift by one.
export const movePanelTo = (panels: OverviewPanels, variable: PanelVariable, to: number): OverviewPanels => {
    const from = panels.order.indexOf(variable)

    if (from < 0 || from === to || to < 0 || to >= panels.order.length) return panels

    const order = panels.order.filter((v) => v !== variable)
    order.splice(to, 0, variable)

    return { ...panels, order }
}

export const movePanel = (panels: OverviewPanels, variable: PanelVariable, step: -1 | 1): OverviewPanels =>
    movePanelTo(panels, variable, panels.order.indexOf(variable) + step)

export const togglePanel = (panels: OverviewPanels, variable: PanelVariable): OverviewPanels => {
    if (panels.hidden.includes(variable)) return { ...panels, hidden: panels.hidden.filter((v) => v !== variable) }

    if (getVisiblePanels(panels).length <= 1) return panels

    return { ...panels, hidden: [...panels.hidden, variable] }
}

// The series the shown panels draw: each panel's own and its second line.
export const getPanelDataVariables = (panels: PanelVariable[]): OverviewVariable[] =>
    panels.flatMap((v) => {
        const secondary = SECONDARY_VARIABLE[v]

        return secondary ? [v, secondary] : [v]
    })
