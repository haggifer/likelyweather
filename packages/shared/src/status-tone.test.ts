import { DISAGREEMENT_TONE } from './status-tone'

describe('DISAGREEMENT_TONE', () => {
    it('colours agreement green, a mixed day amber and a split day red', () => {
        expect(DISAGREEMENT_TONE).toEqual({ agree: 'ok', mixed: 'warn', split: 'fail' })
    })
})
