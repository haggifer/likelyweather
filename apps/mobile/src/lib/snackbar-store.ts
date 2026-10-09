export interface SnackbarAction {
    label: string
    onPress: () => void
}

export interface Snackbar {
    id: number
    message: string
    actions: SnackbarAction[]
}

// Long enough to read a sentence; a message that offers a choice stays a little longer.
const SHORT_MS = 4000
const LONG_MS = 6000
const MAX_ACTIONS = 2

const listeners = new Set<() => void>()
let current: Snackbar | null = null
let lastId = 0
let timer: ReturnType<typeof setTimeout> | undefined

const emit = () => listeners.forEach((listener) => listener())

export const getSnackbar = () => current

export const subscribeSnackbar = (onChange: () => void) => {
    listeners.add(onChange)

    return () => void listeners.delete(onChange)
}

// With an id, only that message closes, so a late timer never closes the message that replaced it.
export const dismissSnackbar = (id?: number) => {
    if (!current || (id !== undefined && current.id !== id)) return

    clearTimeout(timer)
    current = null
    emit()
}

// The app's one feedback surface, the web's toast: a new message replaces the one on screen.
export const showSnackbar = (message: string, actions: SnackbarAction[] = []) => {
    const id = ++lastId

    clearTimeout(timer)
    current = { id, message, actions: actions.slice(0, MAX_ACTIONS) }
    timer = setTimeout(() => dismissSnackbar(id), actions.length ? LONG_MS : SHORT_MS)
    emit()

    return id
}
