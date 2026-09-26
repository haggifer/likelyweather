import { ApiError } from '@fa/shared/api'

class ApiRequestError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
    ) {
        super(message)
    }
}

type Params = Record<string, string | number | undefined | null>

const toQuery = (params?: Params) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')

    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : ''
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(path, init)

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null
        throw new ApiRequestError(res.status, body?.error.code ?? 'http_error', body?.error.message ?? res.statusText)
    }

    return (await res.json()) as T
}

export const apiGet = <T>(path: string, params?: Params) => request<T>(`/api${path}${toQuery(params)}`)

const sha256Hex = async (text: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// CloudFront signs requests to the API's Lambda function URL (origin access control), and for a POST it can only
// do so when the viewer sends the body's SHA-256. Harmless locally.
export const apiPost = async <T>(path: string, body: unknown) => {
    const json = JSON.stringify(body)

    return request<T>(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-amz-content-sha256': await sha256Hex(json) },
        body: json,
    })
}
