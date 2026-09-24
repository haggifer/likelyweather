import ModelDetailView from '@/components/models/ModelDetailView'
import { ModelIdSchema } from '@/shared/api'
import { MODEL_BY_ID } from '@/shared/models'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const generateMetadata = async ({ params }: PageProps<'/models/[id]'>): Promise<Metadata> => {
    const { id } = await params
    const parsed = ModelIdSchema.safeParse(id)

    return { title: parsed.success ? MODEL_BY_ID[parsed.data].name : id }
}

export default async function ModelPage({ params }: PageProps<'/models/[id]'>) {
    const { id } = await params
    const parsed = ModelIdSchema.safeParse(id)

    if (!parsed.success) notFound()

    return <ModelDetailView modelId={parsed.data} />
}
