import { getSlugTitle } from './city-slug'

describe('getSlugTitle', () => {
    it('names the city and its country from the slug, like the web page title', () => {
        expect(getSlugTitle('new-york-us-5128581', 'en')).toEqual({
            name: 'New York',
            region: 'United States',
            countryCode: 'us',
        })
        expect(getSlugTitle('kyiv-ua-703448', 'de').region).toBe('Ukraine')
    })

    it('falls back to the slug when it has no country and id', () => {
        expect(getSlugTitle('somewhere', 'en')).toEqual({ name: 'somewhere', region: '', countryCode: null })
    })
})
