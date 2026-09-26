import { execSync } from 'node:child_process'
import path from 'node:path'
import { E2E_DATABASE_URL } from './playwright.config'

// Migrates and seeds the end-to-end database, so the suite never writes fake forecasts into the development one.
export default function globalSetup() {
    const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL }
    const root = path.resolve(import.meta.dirname, '../..')

    execSync('pnpm db:deploy', { cwd: root, env, stdio: 'inherit' })
    execSync('pnpm db:seed', { cwd: root, env, stdio: 'inherit' })
}
