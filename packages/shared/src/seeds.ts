import { Locale } from './api'

export interface SeedCity {
    id: number
    name: string
    nameLocal: Partial<Record<Locale, string>>
    admin1: string
    admin1Local: Partial<Record<Locale, string>>
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

// Starter cities. Their localized names and regions come from the Open-Meteo geocoder (fetched 2026-09-23 and
// 2026-10-26), with the regions it leaves in English or capitalises written by hand.
export const SEEDS: SeedCity[] = [
    {
        id: 706483,
        name: 'Kharkiv',
        nameLocal: { uk: 'Харків', es: 'Jarkov', de: 'Charkiw', fr: 'Kharkiv', ru: 'Харьков' },
        admin1: 'Kharkiv Oblast',
        admin1Local: {
            uk: 'Харківська область',
            ru: 'Харьковская область',
            es: 'Óblast de Járkov',
            de: 'Oblast Charkiw',
            fr: 'Oblast de Kharkiv',
        },
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
        nameLocal: { uk: 'Київ', es: 'Kyiv', de: 'Kyjiw', fr: 'Kiev', ru: 'Киев' },
        admin1: 'Kyiv City',
        admin1Local: {
            uk: 'Місто Київ',
            ru: 'Киев',
            es: 'Ciudad de Kyiv',
            de: 'Stadt Kiew',
            fr: 'Municipalité de Kiev',
        },
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
        nameLocal: { uk: 'Львів', es: 'Leópolis', de: 'Lwiw', fr: 'Lviv', ru: 'Львов' },
        admin1: 'Lviv Oblast',
        admin1Local: {
            uk: 'Львівська область',
            ru: 'Львовская область',
            es: 'Óblast de Leópolis',
            de: 'Oblast Lwiw',
            fr: 'Oblast de Lviv',
        },
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
        nameLocal: { uk: 'Одеса', es: 'Odesa', de: 'Odessa', fr: 'Odessa', ru: 'Одесса' },
        admin1: 'Odesa Oblast',
        admin1Local: {
            uk: 'Одеська область',
            ru: 'Одесская область',
            es: 'Óblast de Odesa',
            de: 'Odessa',
            fr: "Oblast d'Odessa",
        },
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
        nameLocal: { uk: 'Лондон', es: 'Londres', de: 'London', fr: 'Londres', ru: 'Лондон' },
        admin1: 'England',
        admin1Local: { uk: 'Англія', ru: 'Англия', es: 'Inglaterra', de: 'England', fr: 'Angleterre' },
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
        nameLocal: { uk: 'Берлін', es: 'Berlín', de: 'Berlin', fr: 'Berlin', ru: 'Берлин' },
        admin1: 'State of Berlin',
        admin1Local: { uk: 'Берлін', ru: 'Берлин', es: 'Estado de Berlín', de: 'Land Berlin', fr: 'État de Berlin' },
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
        nameLocal: { uk: 'Варшава', es: 'Varsovia', de: 'Warschau', fr: 'Varsovie', ru: 'Варшава' },
        admin1: 'Mazovia',
        admin1Local: {
            uk: 'Мазовецьке воєводство',
            ru: 'Мазовецкое воеводство',
            es: 'Voivodato de Mazovia',
            de: 'Woiwodschaft Masowien',
            fr: 'Voïvodie de Mazovie',
        },
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
        nameLocal: { uk: 'Нью-Йорк', es: 'Nueva York', de: 'New York City', fr: 'New York', ru: 'Нью-Йорк' },
        admin1: 'New York',
        admin1Local: { uk: 'Нью-Йорк', ru: 'Нью-Йорк', es: 'Nueva York', de: 'New York', fr: 'New York' },
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
        nameLocal: { uk: 'Токіо', es: 'Tokio', de: 'Tokio', fr: 'Tokyo', ru: 'Токио' },
        admin1: 'Tokyo',
        admin1Local: { uk: 'Токіо', ru: 'Токио', es: 'Tokio', de: 'Tokio', fr: 'Préfecture de Tokyo' },
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
        nameLocal: { uk: 'Сідней', es: 'Sídney', de: 'Sydney', fr: 'Sydney', ru: 'Сидней' },
        admin1: 'New South Wales',
        admin1Local: {
            uk: 'Новий Південний Вельс',
            ru: 'Новый Южный Уэльс',
            es: 'Nueva Gales del Sur',
            de: 'New South Wales',
            fr: 'Nouvelle-Galles du Sud',
        },
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
        nameLocal: { uk: 'Париж', es: 'París', de: 'Paris', fr: 'Paris', ru: 'Париж' },
        admin1: 'Île-de-France Region',
        admin1Local: {
            uk: 'Іль-де-Франс',
            ru: 'Иль-де-Франс',
            es: 'Isla de Francia',
            de: 'Île-de-France',
            fr: 'Île-de-France',
        },
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
