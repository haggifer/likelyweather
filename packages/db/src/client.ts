import { PrismaPg } from '@prisma/adapter-pg'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { PrismaClient } from './generated/prisma/client'

export * from './generated/prisma/client'

const globalPrisma = globalThis as unknown as { __faPrisma?: PrismaClient }

const readLocalEnvFile = () => {
    try {
        return readFileSync(path.join(import.meta.dirname, '../../../.env'), 'utf8')
    } catch {
        return null
    }
}

const createPrisma = () =>
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
            max: Number(process.env.PG_POOL_MAX ?? 5),
        }),
    })

// Local processes read the repository-root .env; deployed functions get real environment variables. Values
// already set win (process.loadEnvFile would overwrite them), so a test or CI can point a variable elsewhere.
export const loadLocalEnv = () => {
    const text = readLocalEnvFile()

    if (text === null) return

    for (const [key, value] of Object.entries(parseEnv(text))) process.env[key] ??= value
}

// One client per process. The pg driver adapter works locally and against Neon's pooled endpoint, so the same code
// runs in Docker, CI and Lambda.
export const getPrisma = () => {
    loadLocalEnv()

    return (globalPrisma.__faPrisma ??= createPrisma())
}
