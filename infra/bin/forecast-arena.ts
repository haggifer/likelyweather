import { App } from 'aws-cdk-lib'
import { ForecastArenaStack } from '../lib/forecast-arena-stack'

const app = new App()

// Deploy-time settings come from context (-c key=value) or environment variables; placeholders keep `cdk synth`
// working in CI and locally. None of them is a secret. An unset GitHub secret arrives as an empty string, so empty
// values fall through as well.
const setting = (key: string, envName: string, fallback: string) =>
    (app.node.tryGetContext(key) as string | undefined) || process.env[envName] || fallback

// The site's own domain needs its certificate; without one, it is served on the CloudFront address alone.
const certificateArn = setting('certificateArn', 'CERTIFICATE_ARN', '')
const domainName = setting('domainName', 'DOMAIN_NAME', 'likelyweather.com')

// The stack keeps its first name: renaming it would create a second stack beside the deployed one.
new ForecastArenaStack(app, 'ForecastArenaStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'eu-central-1' },
    alertEmail: setting('budgetEmail', 'BUDGET_EMAIL', 'alerts@example.com'),
    githubRepo: setting('githubRepo', 'GITHUB_REPO', 'owner/likelyweather'),
    githubBranch: setting('githubBranch', 'GITHUB_BRANCH', 'main'),
    monthlyBudgetUsd: Number(setting('monthlyBudgetUsd', 'MONTHLY_BUDGET_USD', '5')),
    domain: certificateArn ? { name: domainName, certificateArn } : undefined,
})
