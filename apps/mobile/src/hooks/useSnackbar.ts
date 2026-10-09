import { useSyncExternalStore } from 'react'
import { getSnackbar, Snackbar, subscribeSnackbar } from '../lib/snackbar-store'

export function useSnackbar(): Snackbar | null {
    return useSyncExternalStore(subscribeSnackbar, getSnackbar)
}
