import { TruthMode } from '@/shared/api'
import { LeadBucket, SkillWindow } from '@/shared/constants'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface FiltersState {
    window: SkillWindow
    mode: TruthMode
    lead: LeadBucket
    validTime: string | null
    hydrated: boolean
}

const initialState: FiltersState = {
    window: 30,
    mode: 'consensus',
    lead: 24,
    validTime: null,
    hydrated: false,
}

const filtersSlice = createSlice({
    name: 'filters',
    initialState,
    reducers: {
        setWindow: (state, action: PayloadAction<SkillWindow>) => {
            state.window = action.payload
        },
        setMode: (state, action: PayloadAction<TruthMode>) => {
            state.mode = action.payload
        },
        setLead: (state, action: PayloadAction<LeadBucket>) => {
            state.lead = action.payload
        },
        setValidTime: (state, action: PayloadAction<string | null>) => {
            state.validTime = action.payload
        },
        hydrateFilters: (state, action: PayloadAction<Partial<Omit<FiltersState, 'hydrated'>>>) => ({
            ...state,
            ...action.payload,
            hydrated: true,
        }),
    },
})

export const { setWindow, setMode, setLead, setValidTime, hydrateFilters } = filtersSlice.actions

export default filtersSlice.reducer
