import { isIPv6 } from 'node:net'

const IPV6_GROUPS = 8
// A /64: mobile networks give each phone its own /64 (RFC 6459), and devices rotate addresses inside it.
const PREFIX_GROUPS = 4
const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i

// An embedded dotted IPv4 tail ("::1.2.3.4") fills two groups.
const countGroups = (groups: string[]) => groups.reduce((sum, group) => sum + (group.includes('.') ? 2 : 1), 0)

const expandIpv6 = (address: string) => {
    const [head, tail] = address.toLowerCase().split('::')
    const headGroups = head ? head.split(':') : []
    const tailGroups = tail ? tail.split(':') : []
    const missing = tail === undefined ? 0 : IPV6_GROUPS - countGroups(headGroups) - countGroups(tailGroups)

    return [...headGroups, ...Array<string>(missing).fill('0'), ...tailGroups]
}

const toPrefix = (address: string) =>
    expandIpv6(address)
        .slice(0, PREFIX_GROUPS)
        .map((group) => parseInt(group, 16).toString(16))
        .join(':')

// The key rate limits and the quota count by: an IPv4 address as it is, an IPv6 address by its /64, so one device
// stays one client and an abuser cannot rotate through a /64. IPv4-mapped IPv6 addresses count as their IPv4
// address; masking them as IPv6 would put every IPv4 client into one bucket.
export const toClientKey = (ip: string) => {
    const mapped = MAPPED_IPV4.exec(ip)

    if (mapped) return mapped[1]

    if (!isIPv6(ip)) return ip

    return `${toPrefix(ip)}::/64`
}
