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

const hex = (color: string) => color as ColorProp

const toRgba = (color: string, alpha: number): ColorProp => {
    const value = parseInt(color.slice(1, 7), 16)

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

const getDeepLink = (slug: string) => `forecastarena://city/${slug}`

interface ViewProps {
    widgetName: string
    model: WidgetModel | null
    city: WidgetCity | null
    colors: Colors
    t: Translator
    locale: string
    now: Date
}

const WidgetView = ({ widgetName, model, city, colors, t, locale, now }: ViewProps) => {
    const isMedium = widgetName === MEDIUM_WIDGET
    const name = city ? getCityName(city, locale) : 'Forecast Arena'
    const tempUnit = VARIABLE_BY_ID[Variable.Temp].unit
    const age = model ? getAgeHours(model.fetchedAt, now) : 0
    const muted = hex(colors['muted-foreground'])
    const text = hex(colors.foreground)
    const ageLine = model && age >= REFRESH_AFTER_HOURS && (
        <TextWidget
            text={t('city.forecastAge', { hours: age })}
            style={{ fontSize: 11, color: age > STALE_AFTER_HOURS ? hex(colors.warning) : muted }}
        />
    )

    return (
        <FlexWidget
            clickAction={city ? 'OPEN_URI' : 'OPEN_APP'}
            clickActionData={city ? { uri: getDeepLink(city.slug) } : undefined}
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: hex(colors.card),
                borderRadius: 18,
                padding: 12,
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
                <TextWidget
                    text={name}
                    truncate="END"
                    maxLines={1}
                    style={{ fontSize: 14, fontWeight: '600', color: text }}
                />
            </FlexWidget>
            {model ? (
                <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
                    <TextWidget
                        text={`${formatNumber(model.temp, 1)} ${tempUnit}`}
                        style={{ fontSize: isMedium ? 30 : 24, fontWeight: '700', color: text }}
                    />
                    {model.label && (
                        <TextWidget
                            text={t(`disagreement.${model.label}`)}
                            style={{
                                marginLeft: 8,
                                fontSize: 12,
                                fontWeight: '600',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 999,
                                color: hex(colors[LABEL_COLORS[model.label]]),
                                backgroundColor: toRgba(colors[LABEL_COLORS[model.label]], CHIP_ALPHA),
                            }}
                        />
                    )}
                </FlexWidget>
            ) : (
                <TextWidget
                    text={t('widget.openApp', { city: name })}
                    maxLines={2}
                    style={{ fontSize: 12, color: muted }}
                />
            )}
            {model && isMedium && (
                <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
                    <TextWidget
                        text={`${t('widget.next24')}: ${formatNumber(model.tempMin, 1)}–${formatNumber(model.tempMax, 1)} ${tempUnit}`}
                        style={{ fontSize: 12, color: text }}
                    />
                    <TextWidget
                        text={`${t('widget.wind')} ${formatNumber(model.wind, 1)} ${VARIABLE_BY_ID[Variable.Wind].unit} · ${t('widget.rain')} ${formatNumber(model.precipTotal, 1)} ${VARIABLE_BY_ID[Variable.Precip].unit}`}
                        style={{ fontSize: 12, color: text }}
                    />
                    {ageLine}
                </FlexWidget>
            )}
            {!isMedium && ageLine}
        </FlexWidget>
    )
}

interface IProps {
    widgetName: string
    model: WidgetModel | null
    city: WidgetCity | null
    theme: ThemeSetting
    t: Translator
    locale: string
    now: Date
}

// Small (2 × 1): the city, the current median temperature and today's agreement. Medium (4 × 2) adds the next 24
// hours' range, the median wind and the 24-hour rain total. Both show the run's age once it is 3 hours old, so numbers
// kept through a failed refresh never pass for current ones. A tap opens the city in the app.
export const renderForecastWidget = ({ theme, ...props }: IProps): WidgetRepresentation => {
    const light = <WidgetView {...props} colors={LIGHT} />
    const dark = <WidgetView {...props} colors={DARK} />

    if (theme === 'light') return light

    if (theme === 'dark') return { light: dark, dark }

    return { light, dark }
}
