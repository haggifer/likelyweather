import { ModelId } from '@fa/shared/models'
import { toggleItem } from '@fa/shared/toggle-item'
import { Variable } from '@fa/shared/variables'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface DashboardState {
    variable: Variable
    hoverStep: string | null
    highlightedModel: ModelId | null
    hiddenModels: ModelId[]
    isMedianHidden: boolean
    // The variable switch shows its phone design (pairs merged, sub-tabs above the chart) on a phone or wherever its
    // named design does not fit; the switch measures it, the details page reads it.
    isSwitchCompact: boolean
}

const initialState: DashboardState = {
    variable: Variable.Temp,
    hoverStep: null,
    highlightedModel: null,
    hiddenModels: [],
    isMedianHidden: false,
    isSwitchCompact: false,
}

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setVariable: (state, action: PayloadAction<Variable>) => {
            state.variable = action.payload
            state.hoverStep = null
        },
        setHoverStep: (state, action: PayloadAction<string | null>) => {
            state.hoverStep = action.payload
        },
        setHighlightedModel: (state, action: PayloadAction<ModelId | null>) => {
            state.highlightedModel = action.payload
        },
        toggleHiddenModel: (state, action: PayloadAction<ModelId>) => {
            state.hiddenModels = toggleItem(state.hiddenModels, action.payload)
        },
        toggleMedian: (state) => {
            state.isMedianHidden = !state.isMedianHidden
        },
        setSwitchCompact: (state, action: PayloadAction<boolean>) => {
            state.isSwitchCompact = action.payload
        },
        showAllModels: (state) => {
            state.hiddenModels = []
            state.isMedianHidden = false
        },
    },
})

export const {
    setVariable,
    setHoverStep,
    setHighlightedModel,
    toggleHiddenModel,
    toggleMedian,
    showAllModels,
    setSwitchCompact,
} = dashboardSlice.actions

export const dashboardReducer = dashboardSlice.reducer
