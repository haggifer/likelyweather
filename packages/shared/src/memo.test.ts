import { getOrCreate } from './memo'

describe('getOrCreate', () => {
    it('creates a value on the first read and reuses it afterwards', () => {
        const cache = new Map<string, { id: number }>()
        const create = vi.fn(() => ({ id: cache.size }))

        const first = getOrCreate(cache, 'a', create)
        const second = getOrCreate(cache, 'a', create)

        expect(second).toBe(first)
        expect(create).toHaveBeenCalledTimes(1)
    })

    it('keeps one value per key', () => {
        const cache = new Map<string, number>()

        getOrCreate(cache, 'a', () => 1)

        expect(getOrCreate(cache, 'b', () => 2)).toBe(2)
        expect(cache.get('a')).toBe(1)
    })
})
