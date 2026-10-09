const toChannels = (hex: string) => {
    const value = hex.replace('#', '')
    const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value.slice(0, 6)

    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, '0')

// CSS `color-mix(in srgb, a share%, b)` for the token colours, which are all opaque hex values.
export const mixColors = (a: string, b: string, share: number) => {
    const from = toChannels(a)
    const to = toChannels(b)

    return `#${from.map((channel, i) => toHex(channel * share + to[i] * (1 - share))).join('')}`
}

// CSS `color-mix(in srgb, color share%, transparent)`.
export const withAlpha = (color: string, share: number) => `${color.slice(0, 7)}${toHex(share * 255)}`
