# Methodology

How Forecast Arena collects forecasts, defines truth and scores models in the prototype. The in-app `/methodology` page is a short version of this file.

## Sources

| Source | Models | Notes |
|---|---|---|
| Open-Meteo forecast API | `ecmwf_ifs025`, `ecmwf_aifs025_single`, `gfs_seamless`, `gem_global`, `ukmo_seamless`, `jma_seamless`, `cma_grapes_global`; `icon_eu`, `arpege_europe` (Europe only) | Hourly, `past_days=1`, `forecast_days=5`, `wind_speed_unit=ms`, up to 50 locations per request |
| MET Norway Locationforecast 2.0 (compact) | `metno` | One request per city, paced 5 per second, `If-Modified-Since`, descriptive `User-Agent` |
| Open-Meteo Previous Runs API | the nine Open-Meteo models | `<variable>_previous_dayN` for N = 0..7; used for truth and skill |
| Open-Meteo Geocoding API | – | City search, proxied and cached 24 h |

A model is shown for a city only if it returned data there (`City.availableModels`). Regional models outside their domain are not warnings.

## The 6-hour grid

Every run is anchored at `issueTime = floor(now, 6 h)` (00, 06, 12, 18 UTC). The dashboard window is the 24 hours before the issue time plus the 96 hours after it: 21 steps.

- Temperature, wind speed, wind direction and pressure are instant values at the step.
- Precipitation, rain and snowfall are the sum of the six hourly amounts ending at the step (a 06:00 value covers 00:00–06:00). A sum with a missing hour is null.
- met.no instant values are read at the step; its precipitation is `next_6_hours` of the entry six hours earlier, or the six `next_1_hours` blocks.
- `leadHours = validTime − issueTime`.

## Ensemble view (client-side)

For each step, over the models with a value: median, quartiles (linear interpolation), min and max. Hidden models are hidden from view only; the median and bands always use every available model.

- Disagreement per local day: for temperature, wind and pressure, the mean over the day's future steps of (max − min) across models; for precipitation, the range of the models' daily totals, each 6-hour sum attributed to the day of its last hour. Labels: Agree below the `agree` threshold, Split from the `split` threshold, Mixed between (`src/shared/variables.ts`).
- Chance of rain per step: share of models above 0.2 mm in that 6-hour step.
- Median wind direction: the circular median (the model direction that minimises the summed angular distance to the others).

## Truth

Truth is model analysis, not station observations.

- A model's analysis at a valid time is `previous_day0` from the Previous Runs API: the value from its most recent run, 0 to 6 hours old.
- Consensus truth (default): the median of the models' analyses when at least 5 contribute; otherwise no truth for that step.
- Self-analysis truth: each model's own analysis. This measures how much a model changes its mind, not how right it is.
- Only valid times in the past are scored.

## Errors and skill

For model *m*, lead bucket *L* ∈ {24, 48, 72, 96} h (the run issued *L*/24 days earlier, `previous_day{L/24}`), and every 6-hour valid time with a forecast and a truth:

- error = forecast − truth
- MAE = mean |error|, bias = mean error, RMSE = √(mean error²), n = sample count
- precipitation hit: forecast and truth both above, or both at or below, 0.2 mm; hit rate = hits / n
- daily sparkline: MAE per UTC day in the window
- worst: the ten largest |error| samples (the heatmap's "why" popover)

Windows of 7, 30 and 90 days end at the current 6-hour step. Cells with fewer than 20 samples are hatched and excluded from the ranking. ARPEGE Europe's horizon is under 96 hours, so its 96 h cell is always empty.

## Evolution

For a chosen valid time, each model's value from runs issued 0 to 7 days earlier, with the consensus truth once the time has passed. The convergence strip shows the standard deviation across models at each offset.

## Limits

- Grid-point values, not the weather at a street corner; elevation differences between grid and city matter for temperature.
- Model analyses share the model's own biases, and consensus truth leans towards the majority.
- met.no has no archive, so it is not scored until the collector has stored its runs.
- The prototype's skill has daily lead resolution (24–96 h); the guide's 6, 12, 18 and 36 h buckets need stored runs.

## Attribution

Weather data by Open-Meteo.com (CC BY 4.0) and MET Norway (CC BY 4.0). Geocoding by Open-Meteo, based on GeoNames. Flags: country-flag-icons (MIT).
