import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: '/theme-lab', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]
    },
}

export default withNextIntl(nextConfig)
