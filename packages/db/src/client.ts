import { PrismaPg } from '@prisma/adapter-pg'
import path from 'node:path'
import { PrismaClient } from './generated/prisma/client'

export * from './generated/prisma/client'

const globalPrisma = globalThis as unknown as { __faPrisma?: PrismaClient }

// One client per process. The pg driver adapter works locally and against Neon's pooled endpoint, so the same code
// runs in Docker, CI and Lambda.
// Local processes read the repository-root .env; deployed functions get real environment variables.
export const loadLocalEnv = () => {
    if (process.env.DATABASE_URL) return

    try {
        process.loadEnvFile(path.join(import.meta.dirname, '../../../.env'))
    } catch {
        // no .env file: the caller's environment is all there is
    }
}

export const getPrisma = () => {
    loadLocalEnv()

    return (globalPrisma.__faPrisma ??= new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
            max: Number(process.env.PG_POOL_MAX ?? 5),
        }),
    }))
}
