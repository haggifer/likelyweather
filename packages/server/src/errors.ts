export class HttpError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
    ) {
        super(message)
    }
}

export const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))
