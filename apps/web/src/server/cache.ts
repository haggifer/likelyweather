// In-process stand-in for Redis (DECISIONS P4). The key names and TTLs match the Redis plan so the swap is
// mechanical; state lives on globalThis so Next.js route bundles in one process share it.
interface Entry {
    value: unknown
    expiresAt: number
}

interface CacheState {
    entries: Map<string, Entry>
    inflight: Map<string, Promise<unknown>>
}

const globalCache = globalThis as unknown as { __faCache?: CacheState }

const state: CacheState = (globalCache.__faCache ??= { entries: new Map(), inflight: new Map() })

export const cacheGet = <T>(key: string): T | undefined => {
    const entry = state.entries.get(key)

    if (!entry) return undefined

    if (entry.expiresAt < Date.now()) {
        state.entries.delete(key)
        return undefined
    }

    return entry.value as T
}

export const cacheSet = (key: string, value: unknown, ttlSeconds: number) => {
    state.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export const cacheDeletePrefix = (prefix: string) => {
    for (const key of state.entries.keys()) {
        if (key.startsWith(prefix)) state.entries.delete(key)
    }
}

export const cached = async <T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> => {
    const hit = cacheGet<T>(key)

    if (hit !== undefined) return hit

    return dedupe(key, async () => {
        const value = await load()
        cacheSet(key, value, ttlSeconds)
        return value
    })
}

export const dedupe = <T>(key: string, run: () => Promise<T>): Promise<T> => {
    const pending = state.inflight.get(key)

    if (pending) return pending as Promise<T>

    const promise = run().finally(() => state.inflight.delete(key))
    state.inflight.set(key, promise)

    return promise
}

export const incrementWindow = (key: string, windowSeconds: number) => {
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000))
    const fullKey = `${key}:${bucket}`
    const count = (cacheGet<number>(fullKey) ?? 0) + 1
    cacheSet(fullKey, count, windowSeconds)

    return count
}
