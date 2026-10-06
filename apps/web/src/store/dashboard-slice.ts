import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface DashboardState {
    variable: Variable
    hoverStep: string | null
    highlightedModel: ModelId | null
    pinnedModels: ModelId[]
    hiddenModels: ModelId[]
    isMedianHidden: boolean
    isUrlHydrated: boolean
}

const initialState: DashboardState = {
    variable: Variable.Temp,
    hoverStep: null,
    highlightedModel: null,
    pinnedModels: [],
    hiddenModels: [],
    isMedianHidden: false,
    isUrlHydrated: false,
}

const toggle = (list: ModelId[], id: ModelId) => (list.includes(id) ? list.filter((m) => m !== id) : [...list, id])

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
        togglePinnedModel: (state, action: PayloadAction<ModelId>) => {
            state.pinnedModels = toggle(state.pinnedModels, action.payload)
        },
        toggleHiddenModel: (state, action: PayloadAction<ModelId>) => {
            state.hiddenModels = toggle(state.hiddenModels, action.payload)
        },
        toggleMedian: (state) => {
            state.isMedianHidden = !state.isMedianHidden
        },
        showAllModels: (state) => {
            state.hiddenModels = []
            state.pinnedModels = []
            state.isMedianHidden = false
        },
        markUrlHydrated: (state) => {
            state.isUrlHydrated = true
        },
    },
})

export const {
    setVariable,
    setHoverStep,
    setHighlightedModel,
    togglePinnedModel,
    toggleHiddenModel,
    toggleMedian,
    showAllModels,
    markUrlHydrated,
} = dashboardSlice.actions

export const dashboardReducer = dashboardSlice.reducer
