import { City } from '@fa/shared/api'
import { getCountryName } from '@fa/shared/format'

export const getCityRegion = (city: Pick<City, 'admin1' | 'country' | 'countryCode'>, locale: string) =>
    [city.admin1, getCountryName(city.countryCode, city.country, locale)].filter(Boolean).join(', ')
