import { Locale } from '@fa/shared/api'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isValidElement, ReactElement, ReactNode } from 'react'
import { renderForecastWidget } from './forecast-widget'
import { WidgetCity } from './widget-model'
import { getTranslator } from './widget-translator'

const CITY: WidgetCity = {
    id: 706483,
    slug: 'kharkiv-ua-706483',
    name: 'Kharkiv',
    nameLocal: { uk: 'Харків' },
    country: 'Ukraine',
    countryCode: 'UA',
    timezone: null,
}
const NOW = new Date('2026-10-06T12:00:00Z')

const getTexts = (node: ReactNode): string[] => {
    if (!isValidElement<{ text?: string; children?: ReactNode }>(node)) return []

    const own = node.props.text === undefined ? [] : [node.props.text]
    const children = [node.props.children].flat(Infinity as 1) as ReactNode[]

    return [...own, ...children.flatMap(getTexts)]
}

// The library calls the widget's view as a plain function to get the widgets it describes; the test does the same.
const drawTexts = (city: WidgetCity | null, locale = Locale.En) => {
    const view = renderForecastWidget({ widgetId: 1, city, model: null, t: getTranslator(locale), locale, now: NOW })
    const { type, props } = view as ReactElement<object, (props: object) => ReactElement>

    return getTexts(type(props))
}

// Metro builds the app with the React Compiler, which gives each component a hook (`useMemoCache`), while
// react-native-android-widget calls widget components as plain functions outside React, so their file opts out. Jest
// doesn't run the compiler, so the test checks the opt-out itself: a directive counts only as the file's first
// statement, after nothing but comments.
describe('forecast-widget', () => {
    it('opts out of the React Compiler', () => {
        const source = readFileSync(join(__dirname, 'forecast-widget.tsx'), 'utf8')

        expect(source).toMatch(/^(\/\/.*\n)*'use no memo'\n/)
    })

    it('shows a city without numbers yet by its name, over a dash', () => {
        expect(drawTexts(CITY, Locale.Uk)).toEqual(['Харків', '–'])
    })

    it('asks for a city only when it has none', () => {
        expect(drawTexts(null)).toEqual(['Tap to choose a city'])
    })
})
