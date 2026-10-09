import { QueryClient } from '@tanstack/react-query'
import { dropExpiredQuota } from './quota-reset'

const NOW = new Date('2026-10-09T12:00:00Z')

// No garbage-collection timer, which would keep Jest running after the tests.
const makeClient = (resetsAt?: string) => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })

    if (!resetsAt) return client

    client.setQueryData(['quota'], { used: 12, limit: 60, resetsAt })

    return client
}

describe('dropExpiredQuota', () => {
    it('drops a restored count whose reset time has passed', () => {
        const client = makeClient('2026-10-09T00:00:00Z')

        dropExpiredQuota(client, NOW)

        expect(client.getQueryData(['quota'])).toBeUndefined()
    })

    it('keeps a count that is still current', () => {
        const client = makeClient('2026-10-10T00:00:00Z')

        dropExpiredQuota(client, NOW)

        expect(client.getQueryData(['quota'])).toEqual({ used: 12, limit: 60, resetsAt: '2026-10-10T00:00:00Z' })
    })

    it('does nothing without a stored count', () => {
        const client = makeClient()

        expect(() => dropExpiredQuota(client, NOW)).not.toThrow()
    })
})
