import { storage } from './storage'
import { createStoredValue } from './stored-value'

const parseCount = (raw: string | null) => {
    const value = Number(raw ?? 'NaN')

    return Number.isFinite(value) ? value : 0
}

describe('createStoredValue', () => {
    beforeEach(() => storage.clearAll())

    it('repairs a missing value, then keeps every update on the device and tells subscribers', () => {
        const store = createStoredValue('test.count', parseCount)
        const onChange = jest.fn()

        store.subscribe(onChange)
        store.set((n) => n + 2)

        expect(store.get()).toBe(2)
        expect(storage.getString('test.count')).toBe('2')
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('reads what an earlier session stored', () => {
        storage.set('test.saved', '41')

        expect(createStoredValue('test.saved', parseCount).get()).toBe(41)
    })
})
