import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface FiltersState {
    validTime: string | null
    hydrated: boolean
}

const initialState: FiltersState = {
    validTime: null,
    hydrated: false,
}

const filtersSlice = createSlice({
    name: 'filters',
    initialState,
    reducers: {
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

export const { setValidTime, hydrateFilters } = filtersSlice.actions

export default filtersSlice.reducer
