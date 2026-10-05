import { ApiRequestError } from './api'

enum ErrorKind {
    QuotaExceeded = 'quotaExceeded',
    RateLimited = 'rateLimited',
    NotFound = 'notFound',
    Pending = 'pending',
    Unavailable = 'unavailable',
    Generic = 'generic',
}

const KIND_BY_CODE: Record<string, ErrorKind> = {
    quota_exceeded: ErrorKind.QuotaExceeded,
    rate_limited: ErrorKind.RateLimited,
    city_not_found: ErrorKind.NotFound,
    place_not_found: ErrorKind.NotFound,
    forecast_pending: ErrorKind.Pending,
    upstream_error: ErrorKind.Unavailable,
}

// The API's messages are English and meant for developers; the UI shows its own copy, chosen by the error code.
export const getErrorKind = (error: unknown) =>
    error instanceof ApiRequestError ? (KIND_BY_CODE[error.code] ?? ErrorKind.Generic) : ErrorKind.Generic

export const isNotFound = (error: unknown) => error instanceof ApiRequestError && error.status === 404
