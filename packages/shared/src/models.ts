export enum ModelId {
    EcmwfIfs = 'ecmwf_ifs025',
    EcmwfAifs = 'ecmwf_aifs025_single',
    Gfs = 'gfs_seamless',
    IconEu = 'icon_eu',
    Gem = 'gem_global',
    Ukmo = 'ukmo_seamless',
    ArpegeEurope = 'arpege_europe',
    Jma = 'jma_seamless',
    Cma = 'cma_grapes_global',
    Metno = 'metno',
}

type ModelSource = 'open-meteo' | 'met.no'

export interface ModelInfo {
    id: ModelId
    name: string
    provider: string
    source: ModelSource
    color: string
    isRegional: boolean
    hotkey: string
    dash?: string
}

// Fixed categorical palette (DECISIONS P9). Never reassigned by a theme preset. IFS/AIFS and the gray met.no fail
// CVD separation, so AIFS and met.no also carry a dash pattern as secondary encoding.
export const MODELS: ModelInfo[] = [
    {
        id: ModelId.EcmwfIfs,
        name: 'ECMWF IFS',
        provider: 'ECMWF',
        source: 'open-meteo',
        color: '#1D4ED8',
        isRegional: false,
        hotkey: '1',
    },
    {
        id: ModelId.EcmwfAifs,
        name: 'ECMWF AIFS',
        provider: 'ECMWF',
        source: 'open-meteo',
        color: '#7C3AED',
        isRegional: false,
        hotkey: '2',
        dash: '6 3',
    },
    {
        id: ModelId.Gfs,
        name: 'GFS',
        provider: 'NOAA',
        source: 'open-meteo',
        color: '#DC2626',
        isRegional: false,
        hotkey: '3',
    },
    {
        id: ModelId.IconEu,
        name: 'ICON-EU',
        provider: 'DWD',
        source: 'open-meteo',
        color: '#059669',
        isRegional: true,
        hotkey: '4',
    },
    {
        id: ModelId.Gem,
        name: 'GEM',
        provider: 'ECCC',
        source: 'open-meteo',
        color: '#D97706',
        isRegional: false,
        hotkey: '5',
    },
    {
        id: ModelId.Ukmo,
        name: 'UKMO',
        provider: 'Met Office',
        source: 'open-meteo',
        color: '#0891B2',
        isRegional: false,
        hotkey: '6',
    },
    {
        id: ModelId.ArpegeEurope,
        name: 'ARPEGE Europe',
        provider: 'Météo-France',
        source: 'open-meteo',
        color: '#DB2777',
        isRegional: true,
        hotkey: '7',
    },
    {
        id: ModelId.Jma,
        name: 'JMA GSM',
        provider: 'JMA',
        source: 'open-meteo',
        color: '#65A30D',
        isRegional: false,
        hotkey: '8',
    },
    {
        id: ModelId.Cma,
        name: 'CMA GRAPES',
        provider: 'CMA',
        source: 'open-meteo',
        color: '#92400E',
        isRegional: false,
        hotkey: '9',
    },
    {
        id: ModelId.Metno,
        name: 'MET Norway',
        provider: 'MET Norway',
        source: 'met.no',
        color: '#475569',
        isRegional: false,
        hotkey: '0',
        dash: '2 3',
    },
]

export const MODEL_BY_ID: Record<ModelId, ModelInfo> = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<
    ModelId,
    ModelInfo
>

export const OPEN_METEO_MODELS: ModelId[] = MODELS.filter((m) => m.source === 'open-meteo').map((m) => m.id)
