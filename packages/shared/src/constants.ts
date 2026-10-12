export const STEP_HOURS = 6
export const HOUR_MS = 3_600_000
export const DAY_MS = 24 * HOUR_MS

// Each run is stored on one hourly grid. A chart starts at the local 3-hour slot the run was fetched in, which can begin
// up to 2 hours before the run's issue time, so the grid starts 3 hours early. It runs to 108 hours so a 96-hour
// chart starting at any later slot is covered.
export const PAST_HOURS = 3
export const FORECAST_HOURS = 108
export const STALE_AFTER_HOURS = 9
// Data fetched this long ago shows its age and can be refreshed; younger data is current.
export const REFRESH_AFTER_HOURS = 3

export const RAIN_THRESHOLD_MM = 0.2
// A place search waits this long after the last keystroke, in both apps, before it asks the geocoder.
export const SEARCH_DEBOUNCE_MS = 200
// "Use my location" opens the nearest stored city only this close; farther away it offers the city instead.
export const NEAREST_MAX_KM = 50
