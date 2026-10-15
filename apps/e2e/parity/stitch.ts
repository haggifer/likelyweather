import type { Rect, TextNode } from './types.ts'

// A node placed in its screen's whole scrolled content, in device pixels from the top.
interface PlacedNode {
    node: TextNode
    top: number
}

interface Pair {
    web: TextNode
    app: TextNode
}

// Two views of one text closer than this on the stitched screen are the same element seen on two pages.
const SAME_PLACE = 8

// Spaces and digits left out: the web may part a number from its unit with a margin instead of a space, and the two
// apps can show different runs, whose figures differ while their size does not (both use tabular figures).
const toKey = (text: string) => text.replace(/\s+/g, '').replace(/\d/g, '0')

const groupByKey = <T>(items: T[], getText: (item: T) => string) => {
    const groups = new Map<string, T[]>()

    for (const item of items) {
        const key = toKey(getText(item))
        groups.set(key, [...(groups.get(key) ?? []), item])
    }

    return groups
}

const isSameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

const getMedian = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

const byPlace = (a: PlacedNode, b: PlacedNode) => a.top - b.top || a.node.rect.x - b.node.rect.x

// How far the content moved between two pages, from texts shown once on both that moved (sticky ones stay put).
const getShift = (previous: TextNode[], current: TextNode[], fallback: number) => {
    const before = groupByKey(previous, (node) => node.text)
    const shifts = [...groupByKey(current, (node) => node.text).entries()].flatMap(([key, nodes]) => {
        const match = before.get(key)

        return nodes.length === 1 && match?.length === 1 && match[0].rect.y !== nodes[0].rect.y
            ? [match[0].rect.y - nodes[0].rect.y]
            : []
    })

    return shifts.length ? getMedian(shifts) : fallback
}

// The app's pages laid end to end as one tall screen, like the web's single page: sticky parts (the same box on two
// pages) count once, and a text seen on two pages keeps its tallest view, the one the screen's edge did not cut.
export const stitchPages = (pages: TextNode[][], fallbackShift: number): PlacedNode[] => {
    const placed: PlacedNode[] = []
    let offset = 0

    pages.forEach((nodes, i) => {
        offset += i ? getShift(pages[i - 1], nodes, fallbackShift) : 0

        for (const node of nodes) {
            const isSticky = i > 0 && pages[i - 1].some((p) => p.text === node.text && isSameRect(p.rect, node.rect))
            const top = node.rect.y + offset
            const twin = placed.findIndex(
                (p) => toKey(p.node.text) === toKey(node.text) && Math.abs(p.top - top) < SAME_PLACE,
            )

            if (isSticky || (twin >= 0 && placed[twin].node.rect.height >= node.rect.height)) {
                continue
            }

            if (twin >= 0) {
                placed.splice(twin, 1)
            }

            placed.push({ node, top })
        }
    })

    return placed.sort(byPlace)
}

export const placeWebNodes = (nodes: TextNode[]): PlacedNode[] =>
    nodes.map((node) => ({ node, top: node.rect.y })).sort(byPlace)

// The same text in both apps, paired in the order it appears from the top, so the third "Mixed" tag on the web
// meets the third one in the app.
export const pairNodes = (web: PlacedNode[], app: PlacedNode[]) => {
    const webGroups = groupByKey(web, ({ node }) => node.text)
    const appGroups = groupByKey(app, ({ node }) => node.text)
    const pairs: Pair[] = []
    const webOnly: string[] = []
    const appOnly: string[] = []

    for (const [key, webNodes] of webGroups) {
        const appNodes = appGroups.get(key) ?? []

        webNodes.forEach(({ node }, i) =>
            appNodes[i] ? pairs.push({ web: node, app: appNodes[i].node }) : webOnly.push(node.text),
        )
    }

    for (const [key, appNodes] of appGroups) {
        appNodes.slice(webGroups.get(key)?.length ?? 0).forEach(({ node }) => appOnly.push(node.text))
    }

    return { pairs, webOnly, appOnly }
}
