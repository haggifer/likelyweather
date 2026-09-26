// JSON-file stand-in for Postgres (City, CollectionRun, Forecast) and S3 (raw archive). The prototype keeps
// the target's table shapes (DECISIONS P3) so the Prisma port replaces these functions, not their callers.
import { env } from '@/server/env'
import { mergeSeeds } from '@/server/seed'
import { City, Run, RunOrigin } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { compactIso } from '@fa/shared/time'
import { ModelSeries } from '@fa/shared/variables'
import { isEqual } from 'es-toolkit'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface SeriesGrid {
    steps: string[]
    models: Partial<Record<ModelId, ModelSeries>>
}

// One run for one city on the hourly grid (`getWindowSteps`).
export interface Snapshot extends SeriesGrid {
    cityId: number
    issueTime: string
    runId: string
    origin: RunOrigin
    fetchedAt: string
    metnoLastModified?: string
}

const LOCK_RETRY_MS = 25
const LOCK_STALE_MS = 10_000

const FILES = {
    cities: () => path.join(env.DATA_DIR, 'cities.json'),
    runs: () => path.join(env.DATA_DIR, 'runs.json'),
    forecasts: (cityId: number) => path.join(env.DATA_DIR, 'forecasts', String(cityId)),
    raw: () => path.join(env.DATA_DIR, 'raw'),
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const readJson = async <T>(file: string, fallback: T): Promise<T> => {
    try {
        const text = await fs.readFile(file, 'utf8')
        return JSON.parse(text) as T
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback
        throw error
    }
}

const writeJsonAtomic = async (file: string, data: unknown) => {
    await fs.mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data))
    await fs.rename(tmp, file)
}

// Cross-process lock so the collector CLI and the dev server never interleave read-modify-write cycles.
const withFileLock = async <T>(file: string, run: () => Promise<T>): Promise<T> => {
    const lock = `${file}.lock`
    await fs.mkdir(path.dirname(file), { recursive: true })

    for (;;) {
        try {
            const handle = await fs.open(lock, 'wx')
            await handle.close()
            break
        } catch {
            const stat = await fs.stat(lock).catch(() => null)

            if (stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
                await fs.rm(lock, { force: true })
                continue
            }

            await sleep(LOCK_RETRY_MS)
        }
    }

    try {
        return await run()
    } finally {
        await fs.rm(lock, { force: true })
    }
}

export const getCities = async () => {
    const cities = await readJson<City[] | null>(FILES.cities(), null)

    if (cities && isEqual(mergeSeeds(cities), cities)) return cities

    return withFileLock(FILES.cities(), async () => {
        const merged = mergeSeeds((await readJson<City[] | null>(FILES.cities(), null)) ?? [])
        await writeJsonAtomic(FILES.cities(), merged)
        return merged
    })
}

export const updateCities = async (mutate: (cities: City[]) => City[]) => {
    await getCities()

    return withFileLock(FILES.cities(), async () => {
        const next = mutate(await readJson<City[]>(FILES.cities(), []))
        await writeJsonAtomic(FILES.cities(), next)
        return next
    })
}

export const getCityBySlug = async (slug: string) => (await getCities()).find((c) => c.slug === slug)

export const getRuns = () => readJson<Run[]>(FILES.runs(), [])

export const upsertRun = (run: Run) =>
    withFileLock(FILES.runs(), async () => {
        const runs = await readJson<Run[]>(FILES.runs(), [])
        const next = [run, ...runs.filter((r) => r.id !== run.id)].sort((a, b) =>
            b.startedAt.localeCompare(a.startedAt),
        )
        await writeJsonAtomic(FILES.runs(), next)
    })

export const writeSnapshot = (snapshot: Snapshot) =>
    writeJsonAtomic(path.join(FILES.forecasts(snapshot.cityId), `${compactIso(snapshot.issueTime)}.json`), snapshot)

export const getLatestSnapshot = async (cityId: number) => {
    const files = await fs.readdir(FILES.forecasts(cityId)).catch(() => [] as string[])
    const latest = files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .at(-1)

    if (!latest) return null

    return readJson<Snapshot | null>(path.join(FILES.forecasts(cityId), latest), null)
}

export const writeRaw = async (runId: string, name: string, body: unknown) => {
    const relative = path.posix.join(runId, `${name}.json`)
    await writeJsonAtomic(path.join(FILES.raw(), relative), body)
    return relative
}

export const readRawDir = async (runId: string) => {
    const dir = path.join(FILES.raw(), runId)
    const files = await fs.readdir(dir).catch(() => [] as string[])
    const entries = await Promise.all(
        files.map(async (f) => [f.replace(/\.json$/, ''), await readJson(path.join(dir, f), null)] as const),
    )

    return Object.fromEntries(entries)
}

export const acquireJobLock = async (name: string, ttlSeconds: number) => {
    const lock = path.join(env.DATA_DIR, `${name}.lock`)
    await fs.mkdir(env.DATA_DIR, { recursive: true })
    const stat = await fs.stat(lock).catch(() => null)

    if (stat && Date.now() - stat.mtimeMs > ttlSeconds * 1000) await fs.rm(lock, { force: true })

    try {
        const handle = await fs.open(lock, 'wx')
        await handle.writeFile(String(process.pid))
        await handle.close()
        return async () => {
            await fs.rm(lock, { force: true })
        }
    } catch {
        return null
    }
}
