import { City } from './api'
import { getCityAdmin1, getCountryName } from './format'

export const getCityRegion = (city: Pick<City, 'admin1' | 'admin1Local' | 'country' | 'countryCode'>, locale: string) =>
    [getCityAdmin1(city, locale), getCountryName(city.countryCode, city.country, locale)].filter(Boolean).join(', ')
