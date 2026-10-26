import { ContactRequest, ContactResponse } from '@fa/shared/api'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { apiPost } from '../api'

export function useSendContact(): UseMutationResult<ContactResponse, Error, ContactRequest> {
    return useMutation({ mutationFn: (request: ContactRequest) => apiPost<ContactResponse>('/contact', request) })
}
