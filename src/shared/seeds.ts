import { Locale } from '@/shared/api'

export interface SeedCity {
    id: number
    name: string
    nameLocal: Partial<Record<Locale, string>>
    admin1: string
    country: string
    countryCode: string
    lat: number
    lon: number
    elevationM: number
    timezone: string
    population: number
}

export const slugify = (name: string, countryCode: string, id: number) =>
    `${
        name
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'city'
    }-${countryCode.toLowerCase()}-${id}`

// Guide §2.3 seed cities plus Paris. Localized names come from the Open-Meteo geocoder (fetched 2026-09-23).
export const SEEDS: SeedCity[] = [
    {
        id: 706483,
        name: 'Kharkiv',
        nameLocal: { uk: 'Харків', es: 'Jarkov', de: 'Charkiw', fr: 'Kharkiv' },
        admin1: 'Kharkiv Oblast',
        country: 'Ukraine',
        countryCode: 'UA',
        lat: 49.98177,
        lon: 36.25475,
        elevationM: 94,
        timezone: 'Europe/Kyiv',
        population: 1421125,
    },
    {
        id: 703448,
        name: 'Kyiv',
        nameLocal: { uk: 'Київ', es: 'Kyiv', de: 'Kyjiw', fr: 'Kiev' },
        admin1: 'Kyiv City',
        country: 'Ukraine',
        countryCode: 'UA',
        lat: 50.45466,
        lon: 30.5238,
        elevationM: 179,
        timezone: 'Europe/Kyiv',
        population: 2952301,
    },
    {
        id: 702550,
        name: 'Lviv',
        nameLocal: { uk: 'Львів', es: 'Leópolis', de: 'Lwiw', fr: 'Lviv' },
        admin1: 'Lviv Oblast',
        country: 'Ukraine',
        countryCode: 'UA',
        lat: 49.83826,
        lon: 24.02324,
        elevationM: 284,
        timezone: 'Europe/Kyiv',
        population: 717273,
    },
    {
        id: 698740,
        name: 'Odesa',
        nameLocal: { uk: 'Одеса', es: 'Odesa', de: 'Odessa', fr: 'Odessa' },
        admin1: 'Odesa Oblast',
        country: 'Ukraine',
        countryCode: 'UA',
        lat: 46.48572,
        lon: 30.74383,
        elevationM: 50,
        timezone: 'Europe/Kyiv',
        population: 1010537,
    },
    {
        id: 2643743,
        name: 'London',
        nameLocal: { uk: 'Лондон', es: 'Londres', de: 'London', fr: 'Londres' },
        admin1: 'England',
        country: 'United Kingdom',
        countryCode: 'GB',
        lat: 51.50853,
        lon: -0.12574,
        elevationM: 25,
        timezone: 'Europe/London',
        population: 8961989,
    },
    {
        id: 2950159,
        name: 'Berlin',
        nameLocal: { uk: 'Берлін', es: 'Berlín', de: 'Berlin', fr: 'Berlin' },
        admin1: 'State of Berlin',
        country: 'Germany',
        countryCode: 'DE',
        lat: 52.52437,
        lon: 13.41053,
        elevationM: 74,
        timezone: 'Europe/Berlin',
        population: 3426354,
    },
    {
        id: 756135,
        name: 'Warsaw',
        nameLocal: { uk: 'Варшава', es: 'Varsovia', de: 'Warschau', fr: 'Varsovie' },
        admin1: 'Mazovia',
        country: 'Poland',
        countryCode: 'PL',
        lat: 52.22977,
        lon: 21.01178,
        elevationM: 113,
        timezone: 'Europe/Warsaw',
        population: 1702139,
    },
    {
        id: 5128581,
        name: 'New York',
        nameLocal: { uk: 'Нью-Йорк', es: 'Nueva York', de: 'New York City', fr: 'New York' },
        admin1: 'New York',
        country: 'United States',
        countryCode: 'US',
        lat: 40.71427,
        lon: -74.00597,
        elevationM: 10,
        timezone: 'America/New_York',
        population: 8804190,
    },
    {
        id: 1850147,
        name: 'Tokyo',
        nameLocal: { uk: 'Токіо', es: 'Tokio', de: 'Tokio', fr: 'Tokyo' },
        admin1: 'Tokyo',
        country: 'Japan',
        countryCode: 'JP',
        lat: 35.6895,
        lon: 139.69171,
        elevationM: 44,
        timezone: 'Asia/Tokyo',
        population: 9733276,
    },
    {
        id: 2147714,
        name: 'Sydney',
        nameLocal: { uk: 'Сідней', es: 'Sídney', de: 'Sydney', fr: 'Sydney' },
        admin1: 'New South Wales',
        country: 'Australia',
        countryCode: 'AU',
        lat: -33.86785,
        lon: 151.20732,
        elevationM: 58,
        timezone: 'Australia/Sydney',
        population: 5557233,
    },
    {
        id: 2988507,
        name: 'Paris',
        nameLocal: { uk: 'Париж', es: 'París', de: 'Paris', fr: 'Paris' },
        admin1: 'Île-de-France Region',
        country: 'France',
        countryCode: 'FR',
        lat: 48.85341,
        lon: 2.3488,
        elevationM: 42,
        timezone: 'Europe/Paris',
        population: 2138551,
    },
]

export const START_WITH_IDS = [5128581, 2643743, 2988507, 703448]
