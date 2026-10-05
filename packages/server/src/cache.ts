// Shared expiring state for every API instance: the geocode and payload caches, rate limits, the daily quota and
// the daily retention claim. Redis (Upstash in the cloud) when REDIS_URL is set, process memory otherwise.
// Redis is never on the critical path: any Redis error degrades to "no cache, no limit, claim granted" for that
// call, so an outage or a refused request costs latency, not availability.
import { Redis } from 'ioredis'
import { env } from './env'
import { getErrorMessage } from './errors'

interface KeyValue {
    get(key: string): Promise<string | null>
    set(key: string, value: string, ttlSeconds: number): Promise<void>
    // Increments the counter in the current fixed window and returns the new count.
    incrementWindow(key: string, windowSeconds: number): Promise<number>
    // Increments every counter only if none has reached its limit; counters expire at `expiresAt` (Unix seconds).
    incrementWithinLimits(keys: string[], limits: number[], expiresAt: number): Promise<boolean>
    // Sets the key only if it is absent, with a TTL; true when this caller now holds it.
    setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>
}

interface Entry {
    value: string
    expiresAt: number
}

const INCREMENT_WITHIN_LIMITS = `
for i, key in ipairs(KEYS) do
    if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[i]) then return 0 end
end
for _, key in ipairs(KEYS) do
    redis.call('INCR', key)
    redis.call('EXPIREAT', key, ARGV[#ARGV])
end
return 1`

let hasWarned = false

const warnOnce = (error: unknown) => {
    if (hasWarned) return

    hasWarned = true
    console.warn(`Redis unavailable, continuing without it: ${getErrorMessage(error)}`)
}

class RedisKeyValue implements KeyValue {
    private client: Redis

    constructor(url: string) {
        // Commands wait for the connection but give up after a second, so a Redis outage only adds latency.
        this.client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2_000, commandTimeout: 1_000 })
        this.client.on('error', (error) => warnOnce(error))
    }

    get(key: string) {
        return this.client.get(key)
    }

    async set(key: string, value: string, ttlSeconds: number) {
        await this.client.set(key, value, 'EX', ttlSeconds)
    }

    async incrementWindow(key: string, windowSeconds: number) {
        const replies = await this.client.multi().incr(key).expire(key, windowSeconds).exec()
        const [[, count]] = replies as [[Error | null, number]]

        return count
    }

    async incrementWithinLimits(keys: string[], limits: number[], expiresAt: number) {
        const result = await this.client.eval(INCREMENT_WITHIN_LIMITS, keys.length, ...keys, ...limits, expiresAt)

        return result === 1
    }

    async setIfAbsent(key: string, value: string, ttlSeconds: number) {
        const reply = await this.client.set(key, value, 'EX', ttlSeconds, 'NX')

        return reply === 'OK'
    }
}

class MemoryKeyValue implements KeyValue {
    private entries = new Map<string, Entry>()

    private read(key: string) {
        const entry = this.entries.get(key)

        if (entry && entry.expiresAt < Date.now()) this.entries.delete(key)

        return this.entries.get(key)?.value ?? null
    }

    private readCount(key: string) {
        return Number(this.read(key) ?? 0)
    }

    private write(key: string, value: string, expiresAt: number) {
        this.entries.set(key, { value, expiresAt })
    }

    async get(key: string) {
        return this.read(key)
    }

    async set(key: string, value: string, ttlSeconds: number) {
        this.write(key, value, Date.now() + ttlSeconds * 1000)
    }

    async incrementWindow(key: string, windowSeconds: number) {
        const count = this.readCount(key) + 1
        const expiresAt = this.entries.get(key)?.expiresAt ?? Date.now() + windowSeconds * 1000

        this.write(key, String(count), expiresAt)

        return count
    }

    async incrementWithinLimits(keys: string[], limits: number[], expiresAt: number) {
        if (keys.some((key, i) => this.readCount(key) >= limits[i])) return false

        keys.forEach((key) => this.write(key, String(this.readCount(key) + 1), expiresAt * 1000))

        return true
    }

    async setIfAbsent(key: string, value: string, ttlSeconds: number) {
        if (this.read(key) !== null) return false

        await this.set(key, value, ttlSeconds)

        return true
    }
}

// Runs a Redis call, or returns `fallback` when Redis fails.
const safely = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
        return await run()
    } catch (error) {
        warnOnce(error)

        return fallback
    }
}

const globalCache = globalThis as unknown as { __faKeyValue?: KeyValue; __faInflight?: Map<string, Promise<unknown>> }

const getStore = (): KeyValue =>
    (globalCache.__faKeyValue ??= env.REDIS_URL ? new RedisKeyValue(env.REDIS_URL) : new MemoryKeyValue())

const inflight = (globalCache.__faInflight ??= new Map())

const cacheGet = async <T>(key: string): Promise<T | undefined> => {
    const text = await safely(() => getStore().get(key), null)

    return text === null ? undefined : (JSON.parse(text) as T)
}

const cacheSet = (key: string, value: unknown, ttlSeconds: number) =>
    safely(() => getStore().set(key, JSON.stringify(value), ttlSeconds), undefined)

// Concurrent calls in one process share a single pending promise.
export const dedupe = <T>(key: string, run: () => Promise<T>): Promise<T> => {
    const pending = inflight.get(key)

    if (pending) return pending as Promise<T>

    const promise = run().finally(() => inflight.delete(key))

    inflight.set(key, promise)

    return promise
}

export const cached = async <T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> => {
    const hit = await cacheGet<T>(key)

    if (hit !== undefined) return hit

    return dedupe(key, async () => {
        const value = await load()

        await cacheSet(key, value, ttlSeconds)

        return value
    })
}

// With Redis down every request is allowed: 0 is below any limit.
export const incrementWindow = (key: string, windowSeconds: number) => {
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000))

    return safely(() => getStore().incrementWindow(`${key}:${bucket}`, windowSeconds), 0)
}

export const getCounter = async (key: string) => {
    const text = await safely(() => getStore().get(key), null)

    return Number(text ?? 0)
}

export const incrementWithinLimits = (keys: string[], limits: number[], expiresAt: Date) =>
    safely(() => getStore().incrementWithinLimits(keys, limits, Math.floor(expiresAt.getTime() / 1000)), true)

// Claims `claim:<name>` for `ttlSeconds`, the equivalent of `SET NX EX`: true for the first caller only. When Redis
// fails every caller gets the claim, so the work it guards must be safe to repeat.
export const claim = (name: string, ttlSeconds: number) =>
    safely(() => getStore().setIfAbsent(`claim:${name}`, '1', ttlSeconds), true)
