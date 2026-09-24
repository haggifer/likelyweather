import Dashboard from '@/components/city/Dashboard'

export default async function CityDashboardPage({ params }: PageProps<'/city/[slug]'>) {
    const { slug } = await params

    return <Dashboard slug={slug} />
}
