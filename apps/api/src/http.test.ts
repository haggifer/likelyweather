import type { Request } from 'express'
import { getClientKey } from './http'

const toRequest = (headers: Record<string, string>) =>
    ({ get: (name: string) => headers[name.toLowerCase()], socket: {} }) as unknown as Request

describe('getClientKey', () => {
    it('keys a CloudFront IPv4 viewer by its address, without the port', () => {
        const req = toRequest({ 'cloudfront-viewer-address': '203.0.113.7:51234' })

        expect(getClientKey(req)).toBe('203.0.113.7')
    })

    it('keys a CloudFront IPv6 viewer by its /64, without the port', () => {
        const req = toRequest({ 'cloudfront-viewer-address': '2001:db8:85a3:42:1c2e:7a1f:9e0:1:60776' })

        expect(getClientKey(req)).toBe('2001:db8:85a3:42::/64')
    })
})
