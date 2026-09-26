import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Forwards /api/* to the Express API. API_ORIGIN is read per request (next.config rewrites are fixed at build time),
// so one build serves any environment. On AWS CloudFront routes /api/* to the API before requests reach Next.js.
export function proxy(request: NextRequest) {
    const origin = process.env.API_ORIGIN ?? 'http://localhost:4000'

    return NextResponse.rewrite(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin))
}

export const config = { matcher: '/api/:path*' }
