// react-native-android-widget calls these components as plain functions, outside React, where the hook the React
// Compiler adds (`useMemoCache`) throws and the widget never draws.
'use no memo'

import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from '@fa/shared/constants'
import { DisagreementLabel } from '@fa/shared/ensemble'
import { formatNumber, getCityName } from '@fa/shared/format'
import { getAgeHours } from '@fa/shared/time'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { ColorProp, FlexWidget, TextWidget, WidgetRepresentation } from 'react-native-android-widget'
import { ThemeSetting } from '../lib/settings'
import { DARK, LIGHT } from '../theme/tokens'
import { WidgetCity, WidgetModel } from './widget-model'
import { MEDIUM_WIDGET } from './widget-names'
import { Translator } from './widget-translator'

type Colors = typeof LIGHT

const LABEL_COLORS: Record<DisagreementLabel, keyof Colors> = {
    agree: 'success',
    mixed: 'warning',
    split: 'destructive',
}
const CHIP_ALPHA = 0.16
// The card colour, translucent: the wallpaper shows through, and the text stays readable on any of them.
const TINT_ALPHA = 0.72
const APP_NAME = 'Forecast Arena'

const hex = (color: string) => color as ColorProp

const toRgba = (color: string, alpha: number): ColorProp => {
    const value = parseInt(color.slice(1, 7), 16)

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

const getCityLink = (slug: string) => `forecastarena://city/${slug}`

// A widget without a city opens the app's city picker for that widget, since some launchers never offer to configure
// a placed widget again.
const getPickerLink = (widgetId: number) => `forecastarena://widget-city/${widgetId}`

interface ViewProps {
    widgetId: number
    widgetName: string
    model: WidgetModel | null
    city: WidgetCity | null
    colors: Colors
    t: Translator
    locale: string
    now: Date
}

const WidgetView = ({ widgetId, widgetName, model, city, colors, t, locale, now }: ViewProps) => {
    const isMedium = widgetName === MEDIUM_WIDGET
    const name = city ? getCityName(city, locale) : APP_NAME
    const tempUnit = VARIABLE_BY_ID[Variable.Temp].unit
    const age = model ? getAgeHours(model.fetchedAt, now) : 0
    const isOutdated = model !== null && age >= REFRESH_AFTER_HOURS
    const muted = hex(colors['muted-foreground'])
    const text = hex(colors.foreground)
    const labelColor = model?.label ? colors[LABEL_COLORS[model.label]] : null
    const ageText = isOutdated && (
        <TextWidget
            text={t('city.forecastAge', { hours: age })}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 11, color: age > STALE_AFTER_HOURS ? hex(colors.warning) : muted }}
        />
    )
    // The small widget has room for one short word beside the name: the run's age once it is outdated, otherwise
    // today's agreement as coloured text; the medium one shows the agreement as a chip beside the temperature.
    const smallStatus =
        ageText ||
        (model?.label && labelColor && (
            <TextWidget
                text={t(`disagreement.${model.label}`)}
                maxLines={1}
                style={{ marginLeft: 6, fontSize: 11, fontWeight: '600', color: hex(labelColor) }}
            />
        ))
    const message = city ? t('widget.openApp', { city: name }) : t('widget.chooseCity')

    return (
        <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: city ? getCityLink(city.slug) : getPickerLink(widgetId) }}
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: toRgba(colors.card, TINT_ALPHA),
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: isMedium ? 12 : 8,
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
                <FlexWidget style={{ flex: 1 }}>
                    <TextWidget
                        text={name}
                        truncate="END"
                        maxLines={1}
                        style={{ fontSize: 14, fontWeight: '600', color: text }}
                    />
                </FlexWidget>
                {!isMedium && smallStatus}
            </FlexWidget>
            {model ? (
                <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
                    <TextWidget
                        text={`${formatNumber(model.temp, 1)} ${tempUnit}`}
                        maxLines={1}
                        style={{ fontSize: isMedium ? 30 : 24, fontWeight: '700', color: text }}
                    />
                    {isMedium && model.label && labelColor && (
                        <TextWidget
                            text={t(`disagreement.${model.label}`)}
                            maxLines={1}
                            style={{
                                marginLeft: 8,
                                fontSize: 12,
                                fontWeight: '600',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 999,
                                color: hex(labelColor),
                                backgroundColor: toRgba(labelColor, CHIP_ALPHA),
                            }}
                        />
                    )}
                </FlexWidget>
            ) : (
                <TextWidget text={message} maxLines={2} truncate="END" style={{ fontSize: 12, color: muted }} />
            )}
            {model && isMedium && (
                <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
                    <TextWidget
                        text={`${t('widget.next24')}: ${formatNumber(model.tempMin, 1)}–${formatNumber(model.tempMax, 1)} ${tempUnit}`}
                        maxLines={1}
                        truncate="END"
                        style={{ fontSize: 12, color: text }}
                    />
                    <TextWidget
                        text={`${t('widget.wind')} ${formatNumber(model.wind, 1)} ${VARIABLE_BY_ID[Variable.Wind].unit} · ${t('widget.rain')} ${formatNumber(model.precipTotal, 1)} ${VARIABLE_BY_ID[Variable.Precip].unit}`}
                        maxLines={1}
                        truncate="END"
                        style={{ fontSize: 12, color: text }}
                    />
                    {ageText}
                </FlexWidget>
            )}
        </FlexWidget>
    )
}

interface IProps {
    widgetId: number
    widgetName: string
    model: WidgetModel | null
    city: WidgetCity | null
    theme: ThemeSetting
    t: Translator
    locale: string
    now: Date
}

// Small (2 × 1): the city with today's agreement (or the run's age once it is 3 hours old) and the current median
// temperature. Medium (4 × 2) adds the next 24 hours' range, the median wind and the 24-hour rain total. The age keeps
// numbers held through a failed refresh from passing for current ones. A tap opens the city in the app, or the city
// picker while the widget has none.
export const renderForecastWidget = ({ theme, ...props }: IProps): WidgetRepresentation => {
    const light = <WidgetView {...props} colors={LIGHT} />
    const dark = <WidgetView {...props} colors={DARK} />

    if (theme === 'light') return light

    if (theme === 'dark') return { light: dark, dark }

    return { light, dark }
}
