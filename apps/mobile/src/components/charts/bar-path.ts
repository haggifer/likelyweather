// A bar standing on its baseline with only the top corners rounded, Recharts' `radius={[4, 4, 0, 0]}`. The radius
// shrinks for a bar too narrow or too short to hold it.
export const getTopRoundedBarPath = (x: number, y: number, width: number, height: number, radius: number) => {
    const r = Math.max(0, Math.min(radius, width / 2, height))
    const bottom = y + height

    return [
        `M${x},${bottom}`,
        `V${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `H${x + width - r}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `V${bottom}`,
        'Z',
    ].join(' ')
}
