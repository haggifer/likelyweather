export const STEP_HOURS = 6
export const HOUR_MS = 3_600_000
export const STEP_MS = STEP_HOURS * HOUR_MS

export const PAST_HOURS = 24
export const HOURLY_PAST_HOURS = 12
export const FORECAST_HOURS = 96
// The hourly grid runs longer so a 96-hour chart starting at any later local 3-hour slot is fully covered.
export const HOURLY_FORECAST_HOURS = 108
export const STALE_AFTER_HOURS = 9

export const RAIN_THRESHOLD_MM = 0.2
export const MAX_COMPARE_CITIES = 4

export const SEED_CITY_IDS = [706483, 703448, 702550, 698740, 2643743, 2950159, 756135, 5128581, 1850147, 2147714]
