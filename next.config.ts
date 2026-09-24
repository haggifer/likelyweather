import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    // Test fixtures, the Theme Lab dump and the local JSON store are never part of a deployment.
    outputFileTracingExcludes: { '*': ['./src/fixtures/**', './data/**'] },
    async headers() {
        return [{ source: '/theme-lab', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]
    },
}

export default withNextIntl(nextConfig)
