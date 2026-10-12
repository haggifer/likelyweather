// The plot inside a chart's drawing, between its axes and labels.
export interface PlotRect {
    left: number
    top: number
    right: number
    bottom: number
}

export const isInsidePlot = (x: number, y: number, plot: PlotRect) =>
    x >= plot.left && x <= plot.right && y >= plot.top && y <= plot.bottom
