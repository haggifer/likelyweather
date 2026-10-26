import { ContactRequest, ContactResponse } from '@fa/shared/api'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { apiPost } from '../api'

interface UseSendContactOptions {
    onSuccess?: () => void
}

// The success callback sits on the mutation rather than on one `mutate` call, so it still runs when the reader closes
// the dialog while the message is on its way.
export function useSendContact({ onSuccess }: UseSendContactOptions = {}): UseMutationResult<
    ContactResponse,
    Error,
    ContactRequest
> {
    return useMutation({
        mutationFn: (request: ContactRequest) => apiPost<ContactResponse>('/contact', request),
        onSuccess,
    })
}
