import { describe, expect, it } from 'vitest'
import { resolveSetting } from '../lib/deploy-settings'

describe('resolveSetting', () => {
    it('keeps a set value', () => {
        expect(
            resolveSetting({ name: 'alertEmail', value: 'ops@x.org', fallback: 'a@example.com', isRequired: true }),
        ).toBe('ops@x.org')
    })

    it('falls back for a synth, an empty value counting as unset', () => {
        expect(resolveSetting({ name: 'alertEmail', value: '', fallback: 'a@example.com', isRequired: false })).toBe(
            'a@example.com',
        )
    })

    it('stops a deploy that would fall back', () => {
        expect(() => resolveSetting({ name: 'alertEmail', value: undefined, fallback: 'a', isRequired: true })).toThrow(
            /alertEmail is not set/,
        )
    })
})
