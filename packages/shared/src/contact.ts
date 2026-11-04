// The contact form's rules without zod, so both apps check a draft in the browser without loading it; the API's
// `ContactRequestSchema` is built from the same values, and a test keeps the address pattern equal to zod's own.

// The longest address SMTP delivers to.
export const CONTACT_EMAIL_MAX = 254
export const CONTACT_MESSAGE_MAX = 1000
// `z.email()`'s default pattern.
export const CONTACT_EMAIL_PATTERN =
    /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/

interface ContactDraft {
    email: string
    message: string
}

export const isContactEmailValid = (email: string) => {
    const address = email.trim()

    return address.length <= CONTACT_EMAIL_MAX && CONTACT_EMAIL_PATTERN.test(address)
}

// Send is offered only for what the API would accept, so neither app shows a form the server turns down.
export const isContactReady = ({ email, message }: ContactDraft) => {
    const text = message.trim()

    return isContactEmailValid(email) && text.length > 0 && text.length <= CONTACT_MESSAGE_MAX
}
