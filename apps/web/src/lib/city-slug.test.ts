import { describe, expect, it } from 'vitest'
import { getSlugPlace, getSlugTitle } from './city-slug'

describe('getSlugPlace', () => {
    it('reads the name and the country from a slug', () => {
        expect(getSlugPlace('new-york-us-5128581', 'en')).toEqual({ name: 'New York', country: 'United States' })
    })

    it('names the country in the locale', () => {
        expect(getSlugPlace('kyiv-ua-703448', 'uk')?.country).toBe('Україна')
    })

    it('gives nothing for a slug without a country code and an id', () => {
        expect(getSlugPlace('kyiv', 'en')).toBeNull()
    })
})

describe('getSlugTitle', () => {
    it('joins the name and the country', () => {
        expect(getSlugTitle('kyiv-ua-703448', 'en')).toBe('Kyiv, Ukraine')
    })

    it('falls back to the slug', () => {
        expect(getSlugTitle('kyiv', 'en')).toBe('kyiv')
    })
})
