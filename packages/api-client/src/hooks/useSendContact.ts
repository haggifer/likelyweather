import { ContactRequest, ContactResponse } from '@fa/shared/api'
import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { apiPost } from '../api'

interface UseSendContactOptions {
    onSuccess: () => void
    onErrorAfterUnmount: (error: Error) => void
}

// The reader may close the dialog while the message is on its way, so both callbacks sit on the mutation, which runs
// them after the form is gone; an error the form is still there to show inline is not reported twice. Anything that
// touches the dialog itself belongs in a `mutate` call's own callbacks, which run only while that form is mounted and
// so never reach a dialog the reader has opened again since.
export function useSendContact({
    onSuccess,
    onErrorAfterUnmount,
}: UseSendContactOptions): UseMutationResult<ContactResponse, Error, ContactRequest> {
    const isMountedRef = useRef(false)

    const send = useMutation({
        mutationFn: (request: ContactRequest) => apiPost<ContactResponse>('/contact', request),
        onSuccess,
        onError: (error) => {
            if (!isMountedRef.current) onErrorAfterUnmount(error)
        },
    })

    useEffect(() => {
        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
        }
    }, [])

    return send
}
