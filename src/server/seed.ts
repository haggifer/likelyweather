import { City, CityStatus } from '@/shared/api'

interface SeedCity {
    id: number
    name: string
    uk: string
    admin1: string
    country: string
    countryCode: string
    lat: number
    lon: number
    elevationM: number
    timezone: string
    population: number
}

const SEED_EPOCH = '2026-09-23T00:00:00.000Z'

const SEEDS: SeedCity[] = [
    {
        id: 706483,
        name: 'Kharkiv',
        uk: 'Харків',
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
        uk: 'Київ',
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
        uk: 'Львів',
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
        uk: 'Одеса',
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
        uk: 'Лондон',
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
        uk: 'Берлін',
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
        uk: 'Варшава',
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
        uk: 'Нью-Йорк',
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
        uk: 'Токіо',
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
        uk: 'Сідней',
        admin1: 'New South Wales',
        country: 'Australia',
        countryCode: 'AU',
        lat: -33.86785,
        lon: 151.20732,
        elevationM: 58,
        timezone: 'Australia/Sydney',
        population: 5557233,
    },
]

export const slugify = (name: string, countryCode: string, id: number) =>
    `${
        name
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'city'
    }-${countryCode.toLowerCase()}-${id}`

export const SEED_CITIES: City[] = SEEDS.map(({ uk, ...seed }) => ({
    ...seed,
    slug: slugify(seed.name, seed.countryCode, seed.id),
    nameLocal: { uk },
    status: CityStatus.Active,
    availableModels: [],
    firstTrackedAt: SEED_EPOCH,
    lastViewedAt: SEED_EPOCH,
    viewCount: 0,
    runsCollected: 0,
}))
