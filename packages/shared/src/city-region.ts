import { City } from './api'
import { getCountryName } from './format'

export const getCityRegion = (city: Pick<City, 'admin1' | 'country' | 'countryCode'>, locale: string) =>
    [city.admin1, getCountryName(city.countryCode, city.country, locale)].filter(Boolean).join(', ')
