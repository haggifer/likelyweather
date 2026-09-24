import { ApiError } from '@/shared/api'

export class ApiRequestError extends Error {
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

export const apiPost = <T>(path: string, body: unknown) =>
    request<T>(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
