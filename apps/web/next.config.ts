import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
    // Workspace packages ship TypeScript source.
    transpilePackages: ['@fa/shared', '@fa/ui', '@fa/charts'],
}

export default withNextIntl(nextConfig)
