import { createServer, Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { fetchJson } from './fetch-with-retry'

const OPTIONS = { attempts: 2, timeoutMs: 200, backoffMs: 10 }

// Sends the headers and half the body at once; the first `slowAttempts` requests finish their body too late.
const startServer = (slowAttempts: number) =>
    new Promise<{ server: Server; url: string; getRequests: () => number }>((resolve) => {
        let requests = 0
        const server = createServer((_req, res) => {
            const delayMs = ++requests <= slowAttempts ? 1_000 : 0

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.write('{"ok":')
            setTimeout(() => res.end('true}'), delayMs)
        }).listen(0, () => {
            const { port } = server.address() as AddressInfo

            resolve({ server, url: `http://127.0.0.1:${port}`, getRequests: () => requests })
        })
    })

describe('fetchJson', () => {
    it('retries when the body arrives after the timeout', async () => {
        const { server, url, getRequests } = await startServer(1)

        const body = await fetchJson<{ ok: boolean }>(url, undefined, OPTIONS)

        expect(body).toEqual({ ok: true })
        expect(getRequests()).toBe(2)

        server.closeAllConnections()
        server.close()
    })

    it('fails once every attempt timed out while reading the body', async () => {
        const { server, url, getRequests } = await startServer(2)

        await expect(fetchJson(url, undefined, OPTIONS)).rejects.toThrow(/timeout/)
        expect(getRequests()).toBe(2)

        server.closeAllConnections()
        server.close()
    })
})
