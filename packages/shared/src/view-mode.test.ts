import { parseViewMode } from './view-mode'

describe('parseViewMode', () => {
    it('reads a stored table', () => {
        expect(parseViewMode('"table"')).toBe('table')
    })

    it('opens the charts for anything else', () => {
        expect(parseViewMode(null)).toBe('chart')
        expect(parseViewMode('"chart"')).toBe('chart')
        expect(parseViewMode('"grid"')).toBe('chart')
        expect(parseViewMode('{broken')).toBe('chart')
    })
})
