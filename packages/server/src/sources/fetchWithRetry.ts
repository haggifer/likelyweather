const RETRYABLE = new Set([429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface RetryOptions {
    attempts?: number
    timeoutMs?: number
    backoffMs?: number
}

export class UpstreamError extends Error {
    constructor(
        public url: string,
        public status: number,
        message: string,
    ) {
        super(message)
    }
}

export const fetchWithRetry = async (
    url: string,
    init: RequestInit = {},
    { attempts = 3, timeoutMs = 20_000, backoffMs = 1_000 }: RetryOptions = {},
) => {
    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })

            if (res.ok || res.status === 304) return res

            const body = await res.text()
            const reason = body.slice(0, 200)
            lastError = new UpstreamError(url, res.status, `${res.status} from ${new URL(url).host}: ${reason}`)

            if (!RETRYABLE.has(res.status)) break
        } catch (error) {
            lastError = error
        }

        if (attempt < attempts) await sleep(backoffMs * 2 ** (attempt - 1))
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export const fetchJson = async <T>(url: string, init?: RequestInit, options?: RetryOptions) => {
    const res = await fetchWithRetry(url, init, options)
    return (await res.json()) as T
}
