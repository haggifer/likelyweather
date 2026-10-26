import { DAY_MS } from '@fa/shared/constants'

export type PromoPlatform = 'android' | 'ios'

export interface AppPromoInput {
    url: string | undefined
    pathname: string
    isCoarsePointer: boolean
    isPhoneWidth: boolean
    platform: PromoPlatform | null
    dismissedAt: string | null
    now: Date
}

// Only Android has an installable build; iOS joins by adding it here and giving the banner a store link.
const PROMO_PLATFORMS: PromoPlatform[] = ['android']
const DISMISS_DAYS = 30
export const DISMISSED_AT_KEY = 'fa.appPromo.dismissedAt'
const PROMO_PATHS = [/^\/$/, /^\/city\//]

// Client hints name the platform directly; older browsers only have the user agent string.
export const getDevicePlatform = (userAgent: string, platformHint?: string): PromoPlatform | null => {
    if (platformHint === 'Android' || /Android/i.test(userAgent)) return 'android'

    if (platformHint === 'iOS' || /iPhone|iPad|iPod/i.test(userAgent)) return 'ios'

    return null
}

const isDismissed = (dismissedAt: string | null, now: Date) => {
    const at = dismissedAt ? new Date(dismissedAt).getTime() : NaN

    return Number.isFinite(at) && now.getTime() - at < DISMISS_DAYS * DAY_MS
}

export const isAppPromoShown = (input: AppPromoInput) =>
    Boolean(input.url) &&
    PROMO_PATHS.some((path) => path.test(input.pathname)) &&
    input.isCoarsePointer &&
    input.isPhoneWidth &&
    input.platform !== null &&
    PROMO_PLATFORMS.includes(input.platform) &&
    !isDismissed(input.dismissedAt, input.now)
