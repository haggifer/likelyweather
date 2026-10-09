import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface DashboardState {
    variable: Variable
    hoverStep: string | null
    highlightedModel: ModelId | null
    hiddenModels: ModelId[]
    isMedianHidden: boolean
}

const initialState: DashboardState = {
    variable: Variable.Temp,
    hoverStep: null,
    highlightedModel: null,
    hiddenModels: [],
    isMedianHidden: false,
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
        toggleHiddenModel: (state, action: PayloadAction<ModelId>) => {
            state.hiddenModels = toggle(state.hiddenModels, action.payload)
        },
        toggleMedian: (state) => {
            state.isMedianHidden = !state.isMedianHidden
        },
        showAllModels: (state) => {
            state.hiddenModels = []
            state.isMedianHidden = false
        },
    },
})

export const { setVariable, setHoverStep, setHighlightedModel, toggleHiddenModel, toggleMedian, showAllModels } =
    dashboardSlice.actions

export const dashboardReducer = dashboardSlice.reducer
