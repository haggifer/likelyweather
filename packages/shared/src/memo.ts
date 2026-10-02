export const getOrCreate = <K, V>(cache: Map<K, V>, key: K, create: () => V) => {
    const cached = cache.get(key)

    if (cached !== undefined) return cached

    const value = create()
    cache.set(key, value)

    return value
}
