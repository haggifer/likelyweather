import { RAIN_THRESHOLD_MM } from './constants'
import { METHODOLOGY_SECTIONS, METHODOLOGY_VALUES, toParagraphs } from './methodology'

describe('methodology', () => {
    it('opens with the sources and quotes the rain threshold the slots use', () => {
        expect(METHODOLOGY_SECTIONS[0]).toBe('sources')
        expect(METHODOLOGY_VALUES.rain).toBe(RAIN_THRESHOLD_MM)
    })

    it('splits a body into its paragraphs, skipping empty lines', () => {
        expect(toParagraphs('First.\nSecond.\n\n')).toEqual(['First.', 'Second.'])
    })
})
