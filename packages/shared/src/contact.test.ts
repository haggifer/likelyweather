import { z } from 'zod'
import { ContactRequestSchema } from './api'
import {
    CONTACT_EMAIL_MAX,
    CONTACT_EMAIL_PATTERN,
    CONTACT_MESSAGE_MAX,
    isContactEmailValid,
    isContactReady,
} from './contact'

const VALID = { email: 'reader@example.com', message: 'The chart is great.' }

describe('ContactRequestSchema', () => {
    it('accepts an address and a message, with the optional honeypot', () => {
        const parsed = ContactRequestSchema.parse({ ...VALID, website: '' })

        expect(parsed).toEqual({ ...VALID, website: '' })
    })

    it('trims the message and refuses one that is only spaces', () => {
        const parsed = ContactRequestSchema.parse({ ...VALID, message: '  Hello  ' })
        const blank = ContactRequestSchema.safeParse({ ...VALID, message: '   ' })

        expect(parsed.message).toBe('Hello')
        expect(blank.success).toBe(false)
    })

    it('refuses an invalid or too long address and a too long message', () => {
        const longAddress = `${'a'.repeat(CONTACT_EMAIL_MAX)}@example.com`

        expect(ContactRequestSchema.safeParse({ ...VALID, email: 'reader@' }).success).toBe(false)
        expect(ContactRequestSchema.safeParse({ ...VALID, email: longAddress }).success).toBe(false)
        expect(ContactRequestSchema.safeParse({ ...VALID, message: 'x'.repeat(CONTACT_MESSAGE_MAX + 1) }).success).toBe(
            false,
        )
    })

    it('refuses a filled honeypot and unknown fields', () => {
        expect(ContactRequestSchema.safeParse({ ...VALID, website: 'https://spam.example' }).success).toBe(false)
        expect(ContactRequestSchema.safeParse({ ...VALID, name: 'Bot' }).success).toBe(false)
    })
})

describe('isContactReady', () => {
    it('needs both fields and a valid address', () => {
        expect(isContactReady(VALID)).toBe(true)
        expect(isContactReady({ ...VALID, email: '' })).toBe(false)
        expect(isContactReady({ ...VALID, message: ' ' })).toBe(false)
        expect(isContactReady({ ...VALID, email: 'reader@example' })).toBe(false)
    })

    it('ignores spaces around the address', () => {
        expect(isContactReady({ ...VALID, email: ' reader@example.com ' })).toBe(true)
    })
})

describe('isContactEmailValid', () => {
    it('checks the address alone, as the API does', () => {
        expect(isContactEmailValid(' reader@example.com ')).toBe(true)
        expect(isContactEmailValid('reader@example')).toBe(false)
        expect(isContactEmailValid('reader')).toBe(false)
    })
})

describe('CONTACT_EMAIL_PATTERN', () => {
    it("is zod's own address pattern, so the apps accept what the API accepts", () => {
        expect(CONTACT_EMAIL_PATTERN.source).toBe(z.regexes.email.source)
        expect(CONTACT_EMAIL_PATTERN.flags).toBe(z.regexes.email.flags)
    })

    it('refuses a long address in the apps as the API does', () => {
        const longAddress = `${'a'.repeat(CONTACT_EMAIL_MAX)}@example.com`

        expect(isContactEmailValid(longAddress)).toBe(false)
        expect(ContactRequestSchema.shape.email.safeParse(longAddress).success).toBe(false)
    })
})
