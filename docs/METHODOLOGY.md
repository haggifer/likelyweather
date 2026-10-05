# Methodology

How Forecast Arena fetches forecasts and combines them. A city's forecast is fetched when someone opens it and a newer 6-hour run exists; nothing is collected on a schedule. The in-app `/methodology` page is a short version of this file. The MVP compares the models with each other, not with what actually happened; measuring which model has been right is a separate, post-MVP feature (DECISIONS P17).

## Sources

| Source                                    | Models                                                                                                                                                               | Notes                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Open-Meteo forecast API                   | `ecmwf_ifs025`, `ecmwf_aifs025_single`, `gfs_seamless`, `gem_global`, `ukmo_seamless`, `jma_seamless`, `cma_grapes_global`; `icon_eu`, `arpege_europe` (Europe only) | Hourly, `past_days=1`, `forecast_days=6`, `wind_speed_unit=ms`, one city per request |
| MET Norway Locationforecast 2.0 (compact) | `metno`                                                                                                                                                              | One request per city, `If-Modified-Since`, descriptive `User-Agent`                  |
| Open-Meteo Geocoding API                  | –                                                                                                                                                                    | City search, proxied and cached 24 h                                                 |

A model is shown for a city only if it returned data there in the stored run. Regional models outside their domain are not warnings.

## One hourly grid per run

Every run is anchored at `issueTime = floor(now, 6 h)` (00, 06, 12, 18 UTC) and stored on one hourly grid: from 3 hours before the issue time to 108 hours after it, 112 steps. The 3 early hours exist because a chart starts at the local 3-hour slot the data arrived in, which can begin up to 2 hours before the issue time; 108 hours cover a 96-hour chart starting at any later slot.

- Temperature, wind speed, wind direction and pressure are instant values at the hour.
- Precipitation, rain and snowfall are the amount of the hour ending at the step. For met.no it is `next_1_hours` of the entry one hour earlier. met.no publishes hourly entries only for about the first 60 hours, then 6-hourly ones, so its later hours are null and later slots take the median of the other models.

## Local 3-hour slots

The client builds every chart (the landing overview, the city dashboard and compare) from the hourly grid (`packages/shared/src/slots.ts`):

- The chart starts at the local 3-hour slot the data arrived in (local 00, 03, 06…) and covers 72 hours on the overview (25 slots, 3 hours apart) and 96 hours on the dashboard and compare (33 slots). Slots stay on whole UTC hours, so a half-hour time zone gets slots at :30 local; after a DST change inside the window the later slots sit one hour off the local marks until the next refresh.
- Instant values are read at each slot. Precipitation at a slot is the amount of the 3 hours after it, so the first readout of a fresh chart is the coming 3 hours. A sum with a missing hour is null.
- Precipitation is drawn as bars: the median total per slot, with a tick per model. Hovering selects the whole 3 hours a bar covers.
- Each overview panel plots the median of all models per slot. The readouts show the slot under the crosshair, or the current slot, and a summary for the next 24 hours: the range for temperature, wind and pressure, and the total for precipitation.
- A chart is stale once the current time is in a later slot than its start; only then are the now line and past shading drawn. The overview re-anchors only on Refresh, which is enabled once it is stale. The dashboard re-anchors on every background refetch (15 minutes) and on Refresh.
- The dashboard's precipitation panel shows 6-hour totals counted from the chart start, each labelled by the hour it ends.

## Ensemble view (client-side)

For each step, over the models with a value: median, quartiles (linear interpolation), min and max. Hidden models are hidden from view only; the median and bands always use every available model.

- Disagreement per local day: for temperature, wind and pressure, the mean over the day's future steps of (max − min) across models; for precipitation, the range of the models' daily totals, each total attributed to the day of its last hour. Labels: Agree below the `agree` threshold, Split from the `split` threshold, Mixed between (`packages/shared/src/variables.ts`).
- Chance of rain per window: share of models above 0.2 mm in that 6-hour total of the precipitation panel.
- Median wind direction: the circular median (the model direction that minimises the summed angular distance to the others).

## Axes

Temperature gridlines are every 5 °C and wind every 2 m/s, with the domain snapped outward to the step. Pressure uses automatic ticks. Precipitation starts at 0 and uses the smallest step from 0.5, 1, 2, 5, 10, 20, 25, 50 mm that reaches the maximum in at most three segments; both sources report 0.1 mm amounts, so a dry forecast shows only 0 and 0.5.

## Limits

- Grid-point values, not the weather at a street corner; elevation differences between grid and city matter for temperature.
- Agreement between models is not accuracy: models that share data or physics can agree and still be wrong together.

## Attribution

Weather data by Open-Meteo.com (CC BY 4.0) and MET Norway (CC BY 4.0). Geocoding by Open-Meteo, based on GeoNames. Flags: country-flag-icons (MIT).
