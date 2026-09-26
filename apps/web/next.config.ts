import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    // Workspace packages ship TypeScript source.
    transpilePackages: ['@fa/shared', '@fa/ui', '@fa/charts'],
    // Test fixtures and the local JSON store are never part of a deployment.
    outputFileTracingExcludes: { '*': ['./src/fixtures/**', './data/**'] },
}

export default withNextIntl(nextConfig)
