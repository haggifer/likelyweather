interface IProps {
    data: Record<string, unknown>
}

// `<` is escaped so that no value can close the script element early.
export function JsonLd({ data }: IProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    )
}
