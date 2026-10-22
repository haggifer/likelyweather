// react-native-android-widget calls these components as plain functions, outside React, where the hook the React
// Compiler adds (`useMemoCache`) throws and the widget never draws.
'use no memo'

import { formatNumber } from '@fa/shared/format'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { isDaylight } from '@fa/shared/weather-condition'
import { FlexWidget, SvgWidget, TextWidget, WidgetRepresentation } from 'react-native-android-widget'
import { getTrendIcon, getWeatherIcon } from './weather-icons'
import { WidgetCity, WidgetModel } from './widget-model'
import { Translator } from './widget-translator'

// No card: like the native time beside it, the text is white with a soft shadow over the wallpaper, in either theme.
const ON_WALLPAPER = {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
} as const
// Room for the longest condition, "Переменная облачность", on one line at full size, while staying right of the time
// on a phone's four columns; a label that still does not fit is set smaller rather than wrapped.
const WEATHER_WIDTH = 176
// Tall enough to set the temperature under it on the date's line beside it.
const WEATHER_ICON_SIZE = 48

// The app's city picker for this widget, the search it was placed with: some launchers never offer to configure a
// placed widget again.
const getPickerLink = (widgetId: number) => `forecastarena://widget-city/${widgetId}`

interface IProps {
    widgetId: number
    model: WidgetModel | null
    city: WidgetCity | null
    t: Translator
    now: Date
}

// The drawn half of the clock widget (4 × 2): its left stays empty for the native time and date
// (`plugins/widget-layouts`), and the weather sits on the right: the sky's icon and condition, then the current
// temperature with its trend. A tap there opens the widget's city picker.
const ClockView = ({ widgetId, model, city, t, now }: IProps) => {
    const temp = model
        ? `${formatNumber(model.current?.temp ?? model.temp, 0)}${VARIABLE_BY_ID[Variable.Temp].unit}`
        : null
    const condition = model?.condition ?? null
    const trend = model?.trend ?? null
    const isDay = city?.coordinates ? isDaylight(city.coordinates, now) : true

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                paddingVertical: 8,
            }}
        >
            <FlexWidget
                clickAction="OPEN_URI"
                clickActionData={{ uri: getPickerLink(widgetId) }}
                style={{ width: WEATHER_WIDTH, flexDirection: 'column', alignItems: 'flex-end' }}
            >
                {condition && (
                    <SvgWidget
                        svg={getWeatherIcon(condition, isDay)}
                        style={{ height: WEATHER_ICON_SIZE, width: WEATHER_ICON_SIZE }}
                    />
                )}
                {temp && condition && (
                    <TextWidget
                        text={t(`widget.condition.${condition}`)}
                        maxLines={1}
                        style={{
                            width: 'match_parent',
                            marginTop: 2,
                            fontSize: 14,
                            adjustsFontSizeToFit: true,
                            textAlign: 'right',
                            ...ON_WALLPAPER,
                        }}
                    />
                )}
                {temp ? (
                    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextWidget text={temp} maxLines={1} style={{ fontSize: 16, ...ON_WALLPAPER }} />
                        {trend && (
                            <SvgWidget svg={getTrendIcon(trend)} style={{ marginLeft: 4, height: 18, width: 18 }} />
                        )}
                    </FlexWidget>
                ) : (
                    <TextWidget
                        text={t('widget.chooseCity')}
                        maxLines={2}
                        style={{ fontSize: 14, textAlign: 'right', ...ON_WALLPAPER }}
                    />
                )}
            </FlexWidget>
        </FlexWidget>
    )
}

export const renderForecastWidget = (props: IProps): WidgetRepresentation => <ClockView {...props} />
