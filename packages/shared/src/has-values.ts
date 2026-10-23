export const hasValues = (values: (number | null)[]) => values.some((v) => v !== null)

export const hasSeriesValues = (series: { values: (number | null)[] }[]) => series.some((s) => hasValues(s.values))
