import { FORECAST_HOURS, PAST_HOURS } from '@fa/shared/constants'
import { addHours, buildSteps } from '@fa/shared/time'

// The hourly grid every run is stored on: PAST_HOURS before the issue time to FORECAST_HOURS after it.
export const getWindowSteps = (issueTime: Date) =>
    buildSteps(addHours(issueTime, -PAST_HOURS), addHours(issueTime, FORECAST_HOURS), 1)
