import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'node:path'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    // A self-contained server for Lambda (see build-lambda.mjs); tracing starts at the monorepo root.
    output: 'standalone',
    outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
    // Workspace packages ship TypeScript source.
    transpilePackages: ['@fa/shared', '@fa/ui', '@fa/charts'],
}

export default withNextIntl(nextConfig)
