import { FORECAST_HOURS, PAST_HOURS } from '@fa/shared/constants'
import { addHours, buildSteps } from '@fa/shared/time'

export const getWindowSteps = (issueTime: Date) =>
    buildSteps(addHours(issueTime, -PAST_HOURS), addHours(issueTime, FORECAST_HOURS), 1)
