import { incrementWindow } from '@fa/server/cache'
import { HttpError } from '@fa/server/errors'
import { ApiError } from '@fa/shared/api'
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'
import { z, ZodError } from 'zod'

export type RateBucket = 'read' | 'geocode' | 'track'

const RATE_LIMITS: Record<RateBucket, { limit: number; windowSeconds: number }> = {
    read: { limit: 120, windowSeconds: 60 },
    geocode: { limit: 30, windowSeconds: 60 },
    track: { limit: 10, windowSeconds: 3600 },
}

const PUBLIC_CACHE = 'public, max-age=300'

// Behind CloudFront the viewer's address arrives in CloudFront-Viewer-Address ("ip:port"); X-Forwarded-For can be
// set by the client, so it is only trusted when that header is absent (local development).
export const getClientIp = (req: Request) => {
    const viewer = req.get('cloudfront-viewer-address')

    if (viewer) return viewer.slice(0, viewer.lastIndexOf(':'))

    return req.get('x-forwarded-for')?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local'
}

export const rateLimit =
    (bucket: RateBucket): RequestHandler =>
    async (req, _res, next) => {
        const { limit, windowSeconds } = RATE_LIMITS[bucket]
        const count = await incrementWindow(`ratelimit:${bucket}:${getClientIp(req)}`, windowSeconds)

        if (count > limit) throw new HttpError(429, 'rate_limited', `Too many ${bucket} requests, slow down`)

        next()
    }

// Express 5 types a path parameter as string | string[] (wildcards); these routes only use plain segments.
export const param = (req: Request, name: string) => String(req.params[name])

export const parseQuery = <S extends z.ZodType>(req: Request, schema: S): z.infer<S> => schema.parse(req.query)

export const parseBody = <S extends z.ZodType>(req: Request, schema: S): z.infer<S> => schema.parse(req.body)

export const sendJson = (res: Response, data: unknown, { cache = true }: { cache?: boolean } = {}) =>
    res.set('Cache-Control', cache ? PUBLIC_CACHE : 'no-store').json(data)

const sendError = (res: Response, status: number, code: string, message: string) =>
    res
        .status(status)
        .set('Cache-Control', 'no-store')
        .json({ error: { code, message } } satisfies ApiError)

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error)

    if (error instanceof HttpError) return sendError(res, error.status, error.code, error.message)

    if (error instanceof ZodError) {
        return sendError(
            res,
            400,
            'invalid_request',
            error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        )
    }

    if ((error as { type?: string }).type === 'entity.parse.failed') {
        return sendError(res, 400, 'invalid_json', 'Request body must be JSON')
    }

    req.log?.error(error)
    sendError(res, 502, 'upstream_error', error instanceof Error ? error.message : String(error))
}

export const notFound: RequestHandler = (req, res) =>
    sendError(res, 404, 'not_found', `No route ${req.method} ${req.path}`)
