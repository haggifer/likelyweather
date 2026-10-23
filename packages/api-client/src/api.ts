import { ApiError } from '@fa/shared/api'

export interface ApiConfig {
    // '' sends requests to the page's own origin (the web app); a native app names the CloudFront origin.
    baseUrl: string
    // Hermes has no crypto.subtle, so a native app supplies its own digest.
    sha256Hex: (text: string) => Promise<string>
}

type Params = Record<string, string | number | undefined | null>

// The API answers within its function's 30-second limit, so a request still open well past that hangs on a stalled
// connection, which React Native's fetch never gives up on: it fails instead, and the screen offers Retry.
const REQUEST_TIMEOUT_MS = 40_000

export class ApiRequestError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
    ) {
        super(message)
    }
}

const toHex = (digest: ArrayBuffer) =>
    Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')

const subtleSha256Hex = async (text: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

    return toHex(digest)
}

export const DEFAULT_API_CONFIG: ApiConfig = { baseUrl: '', sha256Hex: subtleSha256Hex }

const config: ApiConfig = { ...DEFAULT_API_CONFIG }

const toQuery = (params?: Params) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')

    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : ''
}

// Hermes has no AbortSignal.timeout, so the timer is set by hand; it also covers reading the body.
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const res = await fetch(`${config.baseUrl}${path}`, { ...init, signal: controller.signal })

        if (!res.ok) {
            const error: ApiError | null = await res.json().catch(() => null)

            throw new ApiRequestError(
                res.status,
                error?.error?.code ?? 'http_error',
                error?.error?.message ?? res.statusText,
            )
        }

        const body: T = await res.json()

        return body
    } finally {
        clearTimeout(timer)
    }
}

export const configureApi = (overrides: Partial<ApiConfig>) => void Object.assign(config, overrides)

export const isNotFound = (error: unknown) => error instanceof ApiRequestError && error.status === 404

export const apiGet = <T>(path: string, params?: Params) => request<T>(`/api${path}${toQuery(params)}`)

// CloudFront signs requests to the API's Lambda function URL (origin access control), and for a POST it can only
// do so when the viewer sends the body's SHA-256. Harmless locally.
export const apiPost = async <T>(path: string, body: unknown) => {
    const json = JSON.stringify(body)
    const digest = await config.sha256Hex(json)

    return request<T>(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-amz-content-sha256': digest },
        body: json,
    })
}
