import { App } from 'aws-cdk-lib'
import { ForecastArenaStack } from '../lib/forecast-arena-stack'

const app = new App()

// Deploy-time settings come from context (-c key=value) or environment variables; placeholders keep `cdk synth`
// working in CI and locally. None of them is a secret.
const setting = (key: string, envName: string, fallback: string) =>
    (app.node.tryGetContext(key) as string | undefined) ?? process.env[envName] ?? fallback

new ForecastArenaStack(app, 'ForecastArenaStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'eu-central-1' },
    alertEmail: setting('budgetEmail', 'BUDGET_EMAIL', 'alerts@example.com'),
    githubRepo: setting('githubRepo', 'GITHUB_REPO', 'owner/forecast-arena'),
    githubBranch: setting('githubBranch', 'GITHUB_BRANCH', 'main'),
    monthlyBudgetUsd: Number(setting('monthlyBudgetUsd', 'MONTHLY_BUDGET_USD', '5')),
})
