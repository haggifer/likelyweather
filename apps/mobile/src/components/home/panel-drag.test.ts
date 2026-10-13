import { getDropIndex, moveItem } from './panel-drag'

const ROW = 48

describe('getDropIndex', () => {
    it('picks the slot whose row the dragged row covers most', () => {
        expect(getDropIndex(0, ROW, 6)).toBe(0)
        expect(getDropIndex(ROW * 2 - ROW / 2 + 1, ROW, 6)).toBe(2)
        expect(getDropIndex(ROW * 2 + ROW / 2 - 1, ROW, 6)).toBe(2)
    })

    it('stays inside the list', () => {
        expect(getDropIndex(-ROW * 3, ROW, 6)).toBe(0)
        expect(getDropIndex(ROW * 10, ROW, 6)).toBe(5)
    })
})

describe('moveItem', () => {
    it('drops the item at the target and shifts the ones between', () => {
        expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
        expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    })

    it('returns the same list when nothing moves', () => {
        const items = ['a', 'b']

        expect(moveItem(items, 1, 1)).toBe(items)
        expect(moveItem(items, 0, 2)).toBe(items)
    })
})
