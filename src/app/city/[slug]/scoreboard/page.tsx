import ScoreboardView from '@/components/scoreboard/ScoreboardView'

export default async function ScoreboardPage({ params }: PageProps<'/city/[slug]/scoreboard'>) {
    const { slug } = await params

    return <ScoreboardView slug={slug} />
}
