import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    // Test fixtures and the local JSON store are never part of a deployment.
    outputFileTracingExcludes: { '*': ['./src/fixtures/**', './data/**'] },
}

export default withNextIntl(nextConfig)
