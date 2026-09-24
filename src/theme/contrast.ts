export const TEXT_AA = 4.5
export const CHART_MIN = 3

const getChannel = (hex: string, i: number) => {
    const c = hex.replace('#', '')
    const v = c.length === 3 ? c[i] + c[i] : c.slice(i * 2, i * 2 + 2)

    return parseInt(v, 16) / 255
}

const linearize = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))

export const getRelativeLuminance = (hex: string) =>
    0.2126 * linearize(getChannel(hex, 0)) +
    0.7152 * linearize(getChannel(hex, 1)) +
    0.0722 * linearize(getChannel(hex, 2))

export const getContrastRatio = (a: string, b: string) => {
    const l1 = getRelativeLuminance(a)
    const l2 = getRelativeLuminance(b)

    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export const getBestForeground = (background: string) =>
    getContrastRatio('#FFFFFF', background) >= getContrastRatio('#0A0A0A', background) ? '#FFFFFF' : '#0A0A0A'
