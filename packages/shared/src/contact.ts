import { ContactRequestSchema } from './api'

interface ContactDraft {
    email: string
    message: string
}

// Send is offered only for what the API would accept, so neither app shows a form the server turns down.
export const isContactReady = ({ email, message }: ContactDraft) =>
    ContactRequestSchema.safeParse({ email: email.trim(), message }).success

export const isContactEmailValid = (email: string) => ContactRequestSchema.shape.email.safeParse(email.trim()).success
