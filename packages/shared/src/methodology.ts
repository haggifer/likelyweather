import { RAIN_THRESHOLD_MM } from './constants'

// The methodology's sections in reading order, each a `methodology.<section>` catalog entry with a title and a body,
// on the web's page and the app's screen alike.
export const METHODOLOGY_SECTIONS = ['sources', 'median', 'disagreement', 'limits'] as const

// The figures the catalog's methodology text quotes, so the copy follows the rules it describes.
export const METHODOLOGY_VALUES = { rain: RAIN_THRESHOLD_MM }

// A catalog body holds its paragraphs on separate lines.
export const toParagraphs = (text: string) => text.split('\n').filter((paragraph) => paragraph.trim())
