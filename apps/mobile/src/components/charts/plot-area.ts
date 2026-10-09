interface PlotRect {
    left: number
    top: number
    right: number
    bottom: number
}

// The plot inside a chart's drawing of `width` × `height`.
export interface PlotArea {
    plot: PlotRect
    width: number
    height: number
}

interface PlotHitSlop {
    left: number
    top: number
    right: number
    bottom: number
}

export const isInsidePlot = (x: number, y: number, plot: PlotRect) =>
    x >= plot.left && x <= plot.right && y >= plot.top && y <= plot.bottom

// Gesture Handler's negative hit slop shrinks where a gesture may begin, here from the whole drawing to the plot.
export const getPlotHitSlop = ({ plot, width, height }: PlotArea): PlotHitSlop => ({
    left: -plot.left,
    top: -plot.top,
    right: -Math.max(0, width - plot.right),
    bottom: -Math.max(0, height - plot.bottom),
})
