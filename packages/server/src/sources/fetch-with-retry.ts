import { delay } from 'es-toolkit'

interface RetryOptions {
    attempts?: number
    timeoutMs?: number
    backoffMs?: number
}

const RETRYABLE = new Set([429, 500, 502, 503, 504])

class UpstreamError extends Error {
    constructor(
        public url: string,
        public status: number,
        message: string,
    ) {
        super(message)
    }
}

// `read` consumes the body inside the attempt: the timeout also covers the body, and a body that arrives too slowly
// is retried like a request that never answered.
export const fetchWithRetry = async <T>(
    url: string,
    read: (res: Response) => Promise<T>,
    init: RequestInit = {},
    { attempts = 3, timeoutMs = 20_000, backoffMs = 1_000 }: RetryOptions = {},
): Promise<T> => {
    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })

            if (res.ok || res.status === 304) return await read(res)

            const body = await res.text()
            const reason = body.slice(0, 200)

            lastError = new UpstreamError(url, res.status, `${res.status} from ${new URL(url).host}: ${reason}`)

            if (!RETRYABLE.has(res.status)) break
        } catch (error) {
            lastError = error
        }

        if (attempt < attempts) await delay(backoffMs * 2 ** (attempt - 1))
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export const fetchJson = <T>(url: string, init?: RequestInit, options?: RetryOptions) =>
    fetchWithRetry(url, (res): Promise<T> => res.json(), init, options)
