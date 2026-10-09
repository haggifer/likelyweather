import { makeQueryClient } from './query-client'

describe('makeQueryClient', () => {
    it('never refetches on focus or on reconnect, which would spend quota without a click', () => {
        expect(makeQueryClient().getDefaultOptions().queries).toMatchObject({
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        })
    })
})
