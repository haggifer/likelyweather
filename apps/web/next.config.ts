import createMDX from '@next/mdx'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'node:path'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
// The legal pages import their text from .mdx files.
const withMDX = createMDX()

const nextConfig: NextConfig = {
    // Lambda runs this self-contained server (packaged by build-lambda.mjs); tracing starts at the monorepo root so the
    // workspace packages outside this app are included.
    output: 'standalone',
    outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
    // Workspace packages ship TypeScript source.
    transpilePackages: ['@fa/shared', '@fa/messages', '@fa/api-client', '@fa/chart-core', '@fa/hooks'],
    poweredByHeader: false,
    // The stylesheet (about 15 KB compressed) goes into each page's HTML instead of a request that blocks the first
    // paint; every page then carries it rather than the browser caching it once, which costs less on a phone's first visit.
    experimental: { inlineCss: true },
}

export default withNextIntl(withMDX(nextConfig))
