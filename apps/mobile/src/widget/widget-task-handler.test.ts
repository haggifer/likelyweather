import { apiGet } from '@fa/api-client/api'
import { waitFor } from '@testing-library/react-native'
import { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { widgetBindings } from './widget-store'
import { widgetTaskHandler } from './widget-task-handler'

jest.mock('@fa/api-client/api', () => ({ apiGet: jest.fn(() => new Promise(() => {})) }))

const WIDGET_ID = 7

const runTask = (widgetAction: WidgetTaskHandlerProps['widgetAction']) => {
    const renderWidget = jest.fn()

    void widgetTaskHandler({
        widgetInfo: { widgetId: WIDGET_ID, widgetName: 'ForecastClock', width: 250, height: 110, screenInfo: {} },
        widgetAction,
        renderWidget,
    } as unknown as WidgetTaskHandlerProps)

    return renderWidget
}

describe('widgetTaskHandler', () => {
    beforeEach(() =>
        widgetBindings.set(() => ({
            [WIDGET_ID]: {
                id: 1,
                slug: 'kyiv-ua-1',
                name: 'Kyiv',
                country: 'Ukraine',
                countryCode: 'UA',
                timezone: 'Europe/Kyiv',
                coordinates: { lat: 50.45, lon: 30.52 },
            },
        })),
    )

    afterEach(() => {
        widgetBindings.set(() => ({}))
        jest.clearAllMocks()
    })

    it('redraws a resized widget from its saved numbers, without the network', () => {
        const renderWidget = runTask('WIDGET_RESIZED')

        expect(renderWidget).toHaveBeenCalledTimes(1)
        expect(apiGet).not.toHaveBeenCalled()
    })

    it('fetches the city again on an update', async () => {
        runTask('WIDGET_UPDATE')

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
    })
})
