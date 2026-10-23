// Worklets: the sheet's rows follow the finger on the UI thread, which cannot call the shared package's plain
// functions, so the drag keeps its own preview order and the drop commits it through `movePanelTo`.

export const getDropIndex = (top: number, rowHeight: number, count: number) => {
    'worklet'

    return Math.min(Math.max(Math.round(top / rowHeight), 0), count - 1)
}

export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
    'worklet'

    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items

    const moved = items.filter((_, i) => i !== from)
    moved.splice(to, 0, items[from])

    return moved
}
