import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// The Express API. Locally Next forwards /api/* to it; on AWS CloudFront routes /api/* before requests reach Next.
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000'

const nextConfig: NextConfig = {
    // Workspace packages ship TypeScript source.
    transpilePackages: ['@fa/shared', '@fa/ui', '@fa/charts'],
    async rewrites() {
        return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }]
    },
}

export default withNextIntl(nextConfig)
