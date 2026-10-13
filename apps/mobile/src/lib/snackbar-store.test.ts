import { toast } from 'sonner-native'
import { dismissSnackbar, getSnackbar, showSnackbar } from './snackbar-store'

jest.mock('sonner-native', () => ({ toast: { custom: jest.fn(), dismiss: jest.fn() } }))

const mockCustom = jest.mocked(toast.custom)

const getOptions = () => mockCustom.mock.lastCall?.[1]

describe('snackbar store', () => {
    afterEach(() => {
        dismissSnackbar()
        jest.clearAllMocks()
    })

    it('shows a message as a toast for four seconds', () => {
        const id = showSnackbar('Up to date')

        expect(getSnackbar()?.message).toBe('Up to date')
        expect(getOptions()).toMatchObject({ id, duration: 4000 })
    })

    it('keeps a message with actions for six seconds and at most two actions', () => {
        const action = { label: 'Use it', onPress: jest.fn() }

        showSnackbar('Far away', [action, action, action])

        expect(getSnackbar()?.actions).toHaveLength(2)
        expect(getOptions()?.duration).toBe(6000)
    })

    it('forgets the message when the toast closes on its own', () => {
        const id = showSnackbar('Up to date')

        getOptions()?.onAutoClose?.(id)

        expect(getSnackbar()).toBeNull()
    })

    it('replaces the message on screen, and closing the old one never closes the new one', () => {
        const first = showSnackbar('First')
        const second = showSnackbar('Second')

        expect(toast.dismiss).toHaveBeenCalledWith(first)

        dismissSnackbar(first)

        expect(getSnackbar()?.id).toBe(second)

        dismissSnackbar(second)

        expect(getSnackbar()).toBeNull()
        expect(toast.dismiss).toHaveBeenLastCalledWith(second)
    })
})
