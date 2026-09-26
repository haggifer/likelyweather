export const STEP_HOURS = 6
export const HOUR_MS = 3_600_000

// Each run is stored on one hourly grid. A chart starts at the local 3-hour slot the data arrived in, which can begin
// up to 2 hours before the run's issue time, so the grid starts 3 hours early. It runs to 108 hours so a 96-hour
// chart starting at any later slot is covered.
export const PAST_HOURS = 3
export const FORECAST_HOURS = 108
export const STALE_AFTER_HOURS = 9

export const RAIN_THRESHOLD_MM = 0.2
export const MAX_COMPARE_CITIES = 4

export const SEED_CITY_IDS = [706483, 703448, 702550, 698740, 2643743, 2950159, 756135, 5128581, 1850147, 2147714]
