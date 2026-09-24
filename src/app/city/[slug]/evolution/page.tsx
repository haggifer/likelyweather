import EvolutionView from '@/components/evolution/EvolutionView'

export default async function EvolutionPage({ params }: PageProps<'/city/[slug]/evolution'>) {
    const { slug } = await params

    return <EvolutionView slug={slug} />
}
