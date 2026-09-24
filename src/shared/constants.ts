export const STEP_HOURS = 6
export const HOUR_MS = 3_600_000
export const STEP_MS = STEP_HOURS * HOUR_MS

export const PAST_HOURS = 24
export const FORECAST_HOURS = 96
export const STALE_AFTER_HOURS = 9

export const LEAD_BUCKETS = [24, 48, 72, 96] as const
export type LeadBucket = (typeof LEAD_BUCKETS)[number]

export const SKILL_WINDOWS = [7, 30, 90] as const
export type SkillWindow = (typeof SKILL_WINDOWS)[number]

export const MIN_SAMPLES = 20
export const MIN_TRUTH_CONTRIBUTORS = 5
export const PRECIP_HIT_MM = 0.2
export const MAX_COMPARE_CITIES = 4
export const EVOLUTION_MAX_DAYS = 7

export const SEED_CITY_IDS = [706483, 703448, 702550, 698740, 2643743, 2950159, 756135, 5128581, 1850147, 2147714]
