import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Local development keeps its settings in the repository-root .env; CI and AWS set real environment variables.
try {
    process.loadEnvFile(path.join(import.meta.dirname, '../../.env'))
} catch {
    // no .env: rely on the environment
}

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations', seed: 'tsx src/seed.ts' },
    // Migrations use the direct (unpooled) URL when one is set, as Neon requires.
    datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '' },
})
