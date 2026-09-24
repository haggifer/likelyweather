import { incrementWindow } from '@/server/cache'
import { HttpError } from '@/server/errors'
import { ApiError } from '@/shared/api'
import type { NextRequest } from 'next/server'
import { z, ZodError } from 'zod'

export type RateBucket = 'read' | 'geocode' | 'track'

const RATE_LIMITS: Record<RateBucket, { limit: number; windowSeconds: number }> = {
    read: { limit: 120, windowSeconds: 60 },
    geocode: { limit: 30, windowSeconds: 60 },
    track: { limit: 10, windowSeconds: 3600 },
}

const PUBLIC_CACHE = 'public, max-age=300'

export const getClientIp = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'

export const enforceRateLimit = (req: NextRequest, bucket: RateBucket) => {
    const { limit, windowSeconds } = RATE_LIMITS[bucket]
    const count = incrementWindow(`ratelimit:${bucket}:${getClientIp(req)}`, windowSeconds)

    if (count > limit) throw new HttpError(429, 'rate_limited', `Too many ${bucket} requests, slow down`)
}

export const parseQuery = <S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> =>
    schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()))

export const parseBody = async <S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> => {
    const body = await req.json().catch(() => {
        throw new HttpError(400, 'invalid_json', 'Request body must be JSON')
    })

    return schema.parse(body)
}

export const json = (data: unknown, { cache = true, status = 200 }: { cache?: boolean; status?: number } = {}) =>
    Response.json(data, { status, headers: { 'Cache-Control': cache ? PUBLIC_CACHE : 'no-store' } })

const errorResponse = (status: number, code: string, message: string) =>
    Response.json({ error: { code, message } } satisfies ApiError, {
        status,
        headers: { 'Cache-Control': 'no-store' },
    })

export const handle =
    <C>(bucket: RateBucket, run: (req: NextRequest, ctx: C) => Promise<Response>) =>
    async (req: NextRequest, ctx: C) => {
        try {
            enforceRateLimit(req, bucket)
            return await run(req, ctx)
        } catch (error) {
            if (error instanceof HttpError) return errorResponse(error.status, error.code, error.message)

            if (error instanceof ZodError) {
                return errorResponse(
                    400,
                    'invalid_request',
                    error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
                )
            }

            console.error(error)
            return errorResponse(502, 'upstream_error', error instanceof Error ? error.message : String(error))
        }
    }
