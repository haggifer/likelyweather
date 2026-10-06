import { AppPromoInput, getDevicePlatform, isAppPromoShown } from './app-promo'

const NOW = new Date('2026-10-06T12:00:00Z')
const PIXEL_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36'
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString()

const ANDROID_PHONE: AppPromoInput = {
    url: 'https://github.com/example/app/releases/latest',
    pathname: '/',
    isCoarsePointer: true,
    isPhoneWidth: true,
    platform: 'android',
    dismissedAt: null,
    now: NOW,
}

describe('getDevicePlatform', () => {
    it('reads the client hint first, then the user agent', () => {
        expect(getDevicePlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Android')).toBe('android')
        expect(getDevicePlatform(PIXEL_UA)).toBe('android')
        expect(getDevicePlatform(IPHONE_UA)).toBe('ios')
        expect(getDevicePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Windows')).toBeNull()
    })
})

describe('isAppPromoShown', () => {
    it('shows on an Android phone on the landing page and the dashboard', () => {
        expect(isAppPromoShown(ANDROID_PHONE)).toBe(true)
        expect(isAppPromoShown({ ...ANDROID_PHONE, pathname: '/city/kyiv-ua-703448' })).toBe(true)
    })

    it('stays hidden without a release link, on text pages, fine pointers, wide viewports and other platforms', () => {
        expect(isAppPromoShown({ ...ANDROID_PHONE, url: undefined })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, url: '' })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, pathname: '/methodology' })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, isCoarsePointer: false })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, isPhoneWidth: false })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, platform: 'ios' })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, platform: null })).toBe(false)
    })

    it('stays dismissed for 30 days, then comes back', () => {
        expect(isAppPromoShown({ ...ANDROID_PHONE, dismissedAt: daysAgo(10) })).toBe(false)
        expect(isAppPromoShown({ ...ANDROID_PHONE, dismissedAt: daysAgo(31) })).toBe(true)
        expect(isAppPromoShown({ ...ANDROID_PHONE, dismissedAt: 'not a date' })).toBe(true)
    })
})
