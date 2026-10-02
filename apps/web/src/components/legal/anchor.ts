// "4. Prohibited activities" -> "prohibited-activities", so in-document links survive renumbering.
export const toAnchorId = (heading: string) =>
    heading
        .toLowerCase()
        .replace(/^\d+\.\s*/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
