import en from '@fa/messages/catalogs/en.json'
import { TemperatureTrend } from '@fa/shared/temperature-trend'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { WeatherCondition } from '@fa/shared/weather-condition'
import { createRequire } from 'node:module'
import path from 'node:path'
import sharp, { OverlayOptions } from 'sharp'
import { DARK, LIGHT } from '../src/theme/tokens'
import { getTrendIcon, getWeatherIcon } from '../src/widget/weather-icons'

interface Ink {
    color: string
    alpha: string
}

interface TextImage {
    input: Buffer
    width: number
    baseline: number
}

interface TextSpec {
    text: string
    fontFile: string
    size: number
    baseline: number
    left?: number
    right?: number
}

const PREVIEW = path.resolve(import.meta.dirname, '../assets/widgets/forecast-clock-preview.png')
const INTER = path.dirname(createRequire(import.meta.url).resolve('@expo-google-fonts/inter/package.json'))
const LIGHT_FONT = path.join(INTER, '300Light', 'Inter_300Light.ttf')
const REGULAR_FONT = path.join(INTER, '400Regular', 'Inter_400Regular.ttf')
// Pango crops a text to its ink, so every text starts with this invisible strut: the tallest capital and a descender
// give each line of one size the same top, and the baseline sits the capital's height below it.
const STRUT = 'Éy'
const STRUT_CAPITAL = 'É'
// Pango takes a colour's alpha only from its own attribute.
const SHOWN: Ink = { color: '#ffffff', alpha: '100%' }
const SHADOW: Ink = { color: '#000000', alpha: '35%' }
const SHADOW_BLUR = 3
const SHADOW_PADDING = 8
const SHADOW_OFFSET = 3

// The placed clock widget on a 3× phone (a Xiaomi 12T): 348 × 174 dp, and its texts' baselines and edges in pixels,
// measured on a screenshot of it.
const WIDTH = 1044
const HEIGHT = 522
const RADIUS = 48
const TEXT_LEFT = 12
const COLUMN_RIGHT = 1042
const TIME_BASELINE = 207
const DATE_BASELINE = 279
const CONDITION_BASELINE = 218
const TEMP_BASELINE = 281
const TEMP_CAP_HEIGHT = 34
const ICON_TOP = 24
const ICON_SIZE = 144
const TREND_SIZE = 54
const TREND_GAP = 12

const SAMPLE_TEMP = `18${VARIABLE_BY_ID[Variable.Temp].unit}`

// The widget draws over the wallpaper and the picker's sheet is plain, so the preview brings its own sky.
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${DARK.background}"/><stop offset="1" stop-color="${LIGHT.primary}"/>
    </linearGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" rx="${RADIUS}" fill="url(#sky)"/>
</svg>`

const escapeMarkup = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const renderMarkup = (markup: string, fontFile: string, size: number) =>
    sharp({ text: { text: markup, font: `Inter ${size}`, fontfile: fontFile, rgba: true, dpi: 72 } })
        .raw()
        .toBuffer({ resolveWithObject: true })

const getInkColumns = (data: Buffer, width: number, height: number) => {
    const columns = Array.from({ length: width }, (_, x) =>
        Array.from({ length: height }, (_, y) => data[(y * width + x) * 4 + 3]).some((alpha) => alpha > 0),
    )

    return [columns.indexOf(true), columns.lastIndexOf(true)]
}

const renderText = async (text: string, fontFile: string, size: number, ink: Ink): Promise<TextImage> => {
    const markup = `<span alpha="1">${STRUT}</span><span foreground="${ink.color}" alpha="${ink.alpha}">${escapeMarkup(text)}</span>`
    const { data, info } = await renderMarkup(markup, fontFile, size)
    const capital = await renderMarkup(STRUT_CAPITAL, fontFile, size)

    const [left, right] = getInkColumns(data, info.width, info.height)
    const width = right - left + 1
    const input = await sharp(data, { raw: info })
        .extract({ left, top: 0, width, height: info.height })
        .png()
        .toBuffer()

    return { input, width, baseline: capital.info.height }
}

const blur = (input: Buffer) =>
    sharp(input)
        .extend({
            top: SHADOW_PADDING,
            bottom: SHADOW_PADDING,
            left: SHADOW_PADDING,
            right: SHADOW_PADDING,
            background: '#00000000',
        })
        .blur(SHADOW_BLUR)
        .png()
        .toBuffer()

// White with a soft shadow below, as the widget sets its texts.
const placeText = async ({ text, fontFile, size, baseline, left, right }: TextSpec): Promise<OverlayOptions[]> => {
    const shown = await renderText(text, fontFile, size, SHOWN)
    const shadow = await renderText(text, fontFile, size, SHADOW)

    const x = left ?? (right ?? WIDTH) - shown.width
    const y = baseline - shown.baseline

    return [
        { input: await blur(shadow.input), left: x - SHADOW_PADDING, top: y - SHADOW_PADDING + SHADOW_OFFSET },
        { input: shown.input, left: x, top: y },
    ]
}

const renderIcon = (svg: string, size: number) =>
    sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer()

// A partly cloudy, warming afternoon, laid out as `forecast-widget.tsx` and its native layout draw it: the time and
// date on the left; the sky, its condition and the temperature with its trend on the right.
const main = async () => {
    const trendLeft = WIDTH - TREND_SIZE
    const trendTop = TEMP_BASELINE - (TEMP_CAP_HEIGHT + TREND_SIZE) / 2

    const texts = await Promise.all([
        placeText({ text: '12:45', fontFile: LIGHT_FONT, size: 210, baseline: TIME_BASELINE, left: TEXT_LEFT }),
        placeText({
            text: 'Mon, 26 October',
            fontFile: REGULAR_FONT,
            size: 45,
            baseline: DATE_BASELINE,
            left: TEXT_LEFT,
        }),
        placeText({
            text: en.widget.condition.partlyCloudy,
            fontFile: REGULAR_FONT,
            size: 42,
            baseline: CONDITION_BASELINE,
            right: COLUMN_RIGHT,
        }),
        placeText({
            text: SAMPLE_TEMP,
            fontFile: REGULAR_FONT,
            size: 48,
            baseline: TEMP_BASELINE,
            right: trendLeft - TREND_GAP,
        }),
    ])
    const sky = await renderIcon(getWeatherIcon(WeatherCondition.PartlyCloudy, true), ICON_SIZE)
    const trend = await renderIcon(getTrendIcon(TemperatureTrend.Rising), TREND_SIZE)

    await sharp(Buffer.from(BACKDROP))
        .composite([
            ...texts.flat(),
            { input: sky, left: WIDTH - ICON_SIZE, top: ICON_TOP },
            { input: trend, left: trendLeft, top: trendTop },
        ])
        .png()
        .toFile(PREVIEW)
}

void main()
