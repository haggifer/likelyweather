import { createStoredValue } from '../lib/stored-value'
import { WidgetCity, WidgetModel } from './widget-model'

type Bindings = Record<string, WidgetCity>
type Models = Record<string, WidgetModel>

const parseRecord = <T>(raw: string | null): Record<string, T> => {
    try {
        const stored = JSON.parse(raw ?? 'null')

        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
    } catch {
        return {}
    }
}

// Which city each placed widget shows, chosen on the configuration screen; removing the widget removes the entry.
export const widgetBindings = createStoredValue<Bindings>('fa.widgets', parseRecord)

// The last view model each widget drew, so it keeps its numbers (and their age) when it cannot fetch.
export const widgetModels = createStoredValue<Models>('fa.widgetModels', parseRecord)

export const forgetWidget = (widgetId: number) => {
    const key = String(widgetId)
    const without = <T>(record: Record<string, T>) =>
        Object.fromEntries(Object.entries(record).filter(([id]) => id !== key))

    widgetBindings.set(without)
    widgetModels.set(without)
}
