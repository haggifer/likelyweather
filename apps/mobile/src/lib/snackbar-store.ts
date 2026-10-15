import { createElement } from 'react'
import { toast } from 'sonner-native'
import { SnackbarToast } from '../components/ui/SnackbarToast'

export interface SnackbarAction {
    label: string
    onPress: () => void
}

interface Snackbar {
    id: number
    message: string
    actions: SnackbarAction[]
}

interface SnackbarOptions {
    // The web's `toast.error`: the same message with the error icon.
    isError?: boolean
}

// Long enough to read a sentence; a message that offers a choice stays a little longer.
const SHORT_MS = 4000
const LONG_MS = 6000
const MAX_ACTIONS = 2

let current: Snackbar | null = null
let lastId = 0

// The message on screen, until it closes.
export const getSnackbar = (): Snackbar | null => current

const forget = (id: string | number) => {
    if (current?.id === id) current = null
}

// With an id, only that message closes, so a late call never closes the message that replaced it.
export const dismissSnackbar = (id?: number) => {
    if (!current || (id !== undefined && current.id !== id)) return

    toast.dismiss(current.id)
    current = null
}

const handleAction = (id: number, action: SnackbarAction) => {
    dismissSnackbar(id)
    action.onPress()
}

// The app's one feedback surface, the web's toast (sonner there, sonner-native here): a new message replaces the one
// on screen.
export const showSnackbar = (
    message: string,
    actions: SnackbarAction[] = [],
    { isError = false }: SnackbarOptions = {},
) => {
    const id = ++lastId
    const shown = actions.slice(0, MAX_ACTIONS)

    dismissSnackbar()
    current = { id, message, actions: shown }
    toast.custom(
        createElement(SnackbarToast, {
            message,
            actions: shown,
            isError,
            onAction: (action) => handleAction(id, action),
        }),
        { id, duration: shown.length ? LONG_MS : SHORT_MS, onDismiss: forget, onAutoClose: forget },
    )

    return id
}
