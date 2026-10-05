import { incrementWindow } from '@fa/server/cache'
import { getErrorMessage, HttpError } from '@fa/server/errors'
import { ApiError } from '@fa/shared/api'
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'
import { z, ZodError } from 'zod'
import { toClientKey } from './client-key'

export type RateBucket = 'read' | 'geocode' | 'track'

const RATE_LIMITS: Record<RateBucket, { limit: number; windowSeconds: number }> = {
    read: { limit: 120, windowSeconds: 60 },
    geocode: { limit: 30, windowSeconds: 60 },
    track: { limit: 10, windowSeconds: 3600 },
}

const PUBLIC_CACHE = 'public, max-age=300'

// Only the end-to-end suite sets this: all of its traffic comes from one address.
const ARE_LIMITS_DISABLED = process.env.DISABLE_RATE_LIMITS === '1'

const sendError = (res: Response, status: number, code: string, message: string) =>
    res
        .status(status)
        .set('Cache-Control', 'no-store')
        .json({ error: { code, message } } satisfies ApiError)

const getZodMessage = (error: ZodError) => error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')

// Behind CloudFront the viewer's address arrives in CloudFront-Viewer-Address ("ip:port", an IPv6 address without
// brackets); X-Forwarded-For can be set by the client, so it is only trusted when that header is absent (local
// development).
const getClientIp = (req: Request) => {
    const viewer = req.get('cloudfront-viewer-address')

    if (viewer) return viewer.slice(0, viewer.lastIndexOf(':'))

    return req.get('x-forwarded-for')?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local'
}

export const getClientKey = (req: Request) => toClientKey(getClientIp(req))

export const rateLimit =
    (bucket: RateBucket): RequestHandler =>
    async (req, _res, next) => {
        if (ARE_LIMITS_DISABLED) return next()

        const { limit, windowSeconds } = RATE_LIMITS[bucket]
        const count = await incrementWindow(`ratelimit:${bucket}:${getClientKey(req)}`, windowSeconds)

        if (count > limit) throw new HttpError(429, 'rate_limited', `Too many ${bucket} requests, slow down`)

        next()
    }

// Express 5 types a path parameter as string | string[] (wildcards); these routes only use plain segments.
export const getParam = (req: Request, name: string) => String(req.params[name])

export const parseQuery = <S extends z.ZodType>(req: Request, schema: S): z.infer<S> => schema.parse(req.query)

export const parseBody = <S extends z.ZodType>(req: Request, schema: S): z.infer<S> => schema.parse(req.body)

export const sendJson = (res: Response, data: unknown, { isCacheable = true }: { isCacheable?: boolean } = {}) =>
    res.set('Cache-Control', isCacheable ? PUBLIC_CACHE : 'no-store').json(data)

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error)

    if (error instanceof HttpError) return sendError(res, error.status, error.code, error.message)

    if (error instanceof ZodError) return sendError(res, 400, 'invalid_request', getZodMessage(error))

    if ((error as { type?: string }).type === 'entity.parse.failed') {
        return sendError(res, 400, 'invalid_json', 'Request body must be JSON')
    }

    req.log?.error(error)
    sendError(res, 502, 'upstream_error', getErrorMessage(error))
}

export const notFound: RequestHandler = (req, res) =>
    sendError(res, 404, 'not_found', `No route ${req.method} ${req.path}`)
