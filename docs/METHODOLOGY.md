# Methodology

How Forecast Arena collects forecasts and combines them in the prototype. The in-app `/methodology` page is a short version of this file. The MVP compares the models with each other, not with what actually happened; measuring which model has been right is a separate, post-MVP feature (DECISIONS P17).

## Sources

| Source                                    | Models                                                                                                                                                               | Notes                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Open-Meteo forecast API                   | `ecmwf_ifs025`, `ecmwf_aifs025_single`, `gfs_seamless`, `gem_global`, `ukmo_seamless`, `jma_seamless`, `cma_grapes_global`; `icon_eu`, `arpege_europe` (Europe only) | Hourly, `past_days=1`, `forecast_days=5`, `wind_speed_unit=ms`, up to 50 locations per request |
| MET Norway Locationforecast 2.0 (compact) | `metno`                                                                                                                                                              | One request per city, paced 5 per second, `If-Modified-Since`, descriptive `User-Agent`        |
| Open-Meteo Geocoding API                  | –                                                                                                                                                                    | City search, proxied and cached 24 h                                                           |

A model is shown for a city only if it returned data there (`City.availableModels`). Regional models outside their domain are not warnings.

## Two grids from one run

Every run is anchored at `issueTime = floor(now, 6 h)` (00, 06, 12, 18 UTC). The collector parses the same hourly responses onto two grids and stores both in the snapshot.

**The 6-hour grid** (city dashboard, compare): the 24 hours before the issue time plus the 96 hours after it, 21 steps.

- Temperature, wind speed, wind direction and pressure are instant values at the step.
- Precipitation, rain and snowfall are the sum of the six hourly amounts ending at the step (a 06:00 value covers 00:00–06:00). A sum with a missing hour is null.
- met.no instant values are read at the step; its precipitation is `next_6_hours` of the entry six hours earlier, or the six `next_1_hours` blocks.

**The hourly grid** (landing overview): from 12 hours before the issue time to 96 hours after it, 109 steps. Precipitation is the amount of the hour ending at the step; for met.no it is `next_1_hours` of the entry one hour earlier. met.no publishes hourly entries only for about the first 60 hours, then 6-hourly ones, so its later hourly steps are mostly null.

## Landing overview: local 3-hour slots

The client builds the overview from the hourly grid (`src/shared/slots.ts`):

- The chart starts at the local 3-hour slot the data arrived in (local 00, 03, 06…) and covers 72 hours: 25 slots, 3 hours apart. Slots stay on whole UTC hours, so a half-hour time zone gets slots at :30 local; after a DST change inside the window the later slots sit one hour off the local marks until the next refresh.
- Instant values are read at each slot. Precipitation at a slot is the amount of the 3 hours after it, so the first readout of a fresh chart is the coming 3 hours. A sum with a missing hour is null.
- Each panel plots the median of all models per slot. The readouts show the slot under the crosshair, or the current slot, and a summary for the next 24 hours: the range for temperature, wind and pressure, and the total for precipitation.
- The chart is stale once the current time is in a later slot than its start. Only then are the now line and past shading drawn and Refresh enabled.

## Ensemble view (client-side)

For each step, over the models with a value: median, quartiles (linear interpolation), min and max. Hidden models are hidden from view only; the median and bands always use every available model.

- Disagreement per local day: for temperature, wind and pressure, the mean over the day's future steps of (max − min) across models; for precipitation, the range of the models' daily totals, each 6-hour sum attributed to the day of its last hour. Labels: Agree below the `agree` threshold, Split from the `split` threshold, Mixed between (`src/shared/variables.ts`).
- Chance of rain per step: share of models above 0.2 mm in that 6-hour step.
- Median wind direction: the circular median (the model direction that minimises the summed angular distance to the others).

## Axes

Temperature gridlines are every 5 °C and wind every 2 m/s, with the domain snapped outward to the step. Pressure uses automatic ticks. Precipitation starts at 0 and uses the smallest step from 0.5, 1, 2, 5, 10, 20, 50 mm that reaches the maximum in at most three segments; both sources report 0.1 mm amounts, so a dry forecast shows only 0 and 0.5.

## Limits

- Grid-point values, not the weather at a street corner; elevation differences between grid and city matter for temperature.
- Agreement between models is not accuracy: models that share data or physics can agree and still be wrong together.

## Attribution

Weather data by Open-Meteo.com (CC BY 4.0) and MET Norway (CC BY 4.0). Geocoding by Open-Meteo, based on GeoNames. Flags: country-flag-icons (MIT).
