import { createPersistedValue, KeyValueStorage } from './persisted-value'

const createMemoryStorage = (): KeyValueStorage & { items: Map<string, string> } => {
    const items = new Map<string, string>()

    return { items, getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) }
}

const BLOCKED_STORAGE: KeyValueStorage = {
    getItem: () => {
        throw new Error('blocked')
    },
    setItem: () => {
        throw new Error('blocked')
    },
}

const parseCount = (raw: string | null) => {
    const value = Number(raw ?? 'NaN')

    return Number.isFinite(value) ? value : 0
}

describe('createPersistedValue', () => {
    it('repairs a missing value, then stores every update and tells subscribers', () => {
        const storage = createMemoryStorage()
        const value = createPersistedValue(storage, 'count', parseCount)
        const onChange = vi.fn()

        const unsubscribe = value.subscribe(onChange)
        value.set((n) => n + 2)
        unsubscribe()
        value.set((n) => n + 1)

        expect(value.get()).toBe(3)
        expect(storage.items.get('count')).toBe('3')
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('parses once and returns the same object until it changes', () => {
        const storage = createMemoryStorage()
        const parse = vi.fn((raw: string | null) => ({ raw }))
        const value = createPersistedValue(storage, 'object', parse)

        expect(value.get()).toBe(value.get())
        expect(parse).toHaveBeenCalledTimes(1)
    })

    it('reads a change made elsewhere after a reload', () => {
        const storage = createMemoryStorage()
        const value = createPersistedValue(storage, 'count', parseCount)

        value.get()
        storage.items.set('count', '41')

        expect(value.get()).toBe(0)

        value.reload()

        expect(value.get()).toBe(41)
    })

    it('works on without storage', () => {
        const value = createPersistedValue(BLOCKED_STORAGE, 'count', parseCount)

        value.set((n) => n + 5)

        expect(value.get()).toBe(5)
    })
})
