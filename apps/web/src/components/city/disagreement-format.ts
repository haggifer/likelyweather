import { formatNumber } from '@fa/shared/format'

export const formatSpread = (spread: number | undefined, decimals: number) =>
    formatNumber(spread, decimals === 0 ? 1 : decimals)
