import { LegendPlacement } from '@/theme/tokens'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface LayoutState {
    legendPlacement: LegendPlacement
    themeLabOpen: boolean
}

const initialState: LayoutState = {
    legendPlacement: 'side',
    themeLabOpen: false,
}

const layoutSlice = createSlice({
    name: 'layout',
    initialState,
    reducers: {
        setLegendPlacement: (state, action: PayloadAction<LegendPlacement>) => {
            state.legendPlacement = action.payload
        },
        setThemeLabOpen: (state, action: PayloadAction<boolean>) => {
            state.themeLabOpen = action.payload
        },
    },
})

export const { setLegendPlacement, setThemeLabOpen } = layoutSlice.actions

export default layoutSlice.reducer
