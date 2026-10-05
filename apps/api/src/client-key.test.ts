import { toClientKey } from './client-key'

describe('toClientKey', () => {
    it('keeps an IPv4 address as it is', () => {
        expect(toClientKey('203.0.113.7')).toBe('203.0.113.7')
    })

    it('counts an IPv6 address by its /64, whatever the interface part', () => {
        expect(toClientKey('2001:db8:85a3:42:1c2e:7a1f:9e0:1')).toBe('2001:db8:85a3:42::/64')
        expect(toClientKey('2001:0DB8:85A3:0042:ffff:ffff:ffff:ffff')).toBe('2001:db8:85a3:42::/64')
    })

    it('expands compressed IPv6 addresses before taking the prefix', () => {
        expect(toClientKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
        expect(toClientKey('2001:db8:1::')).toBe('2001:db8:1:0::/64')
        expect(toClientKey('::1')).toBe('0:0:0:0::/64')
    })

    it('counts an IPv4-mapped IPv6 address as its IPv4 address', () => {
        expect(toClientKey('::ffff:198.51.100.10')).toBe('198.51.100.10')
        expect(toClientKey('::FFFF:198.51.100.11')).toBe('198.51.100.11')
    })

    it('counts a dotted IPv4 tail as two groups', () => {
        expect(toClientKey('64:ff9b::198.51.100.10')).toBe('64:ff9b:0:0::/64')
    })

    it('passes through a key that is not an address', () => {
        expect(toClientKey('local')).toBe('local')
    })
})
