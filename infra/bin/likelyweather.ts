import { App } from 'aws-cdk-lib'
import { resolveSetting } from '../lib/deploy-settings'
import { LikelyWeatherStack } from '../lib/likelyweather-stack'

const app = new App()

// `pnpm cdk:deploy` passes `-c deploying=true`; synth and diff run without it.
const isDeploying = app.node.tryGetContext('deploying') === 'true'

// Deploy-time settings come from context (-c key=value) or environment variables; placeholders keep `cdk synth`
// working in CI and locally. None of them is a secret.
const setting = (key: string, envName: string, fallback: string, isRequired = false) =>
    resolveSetting({
        name: key,
        value: (app.node.tryGetContext(key) as string | undefined) || process.env[envName],
        fallback,
        isRequired: isRequired && isDeploying,
    })

// The site's own domain needs its certificate; without one, it is served on the CloudFront address alone.
const certificateArn = setting('certificateArn', 'CERTIFICATE_ARN', '')
const domainName = setting('domainName', 'DOMAIN_NAME', 'likelyweather.com')

// The stack keeps its first id: renaming it would create a second stack beside the deployed one.
new LikelyWeatherStack(app, 'ForecastArenaStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'eu-central-1' },
    contactEmail: setting('contactEmail', 'CONTACT_EMAIL', 'alerts@example.com', true),
    githubRepo: setting('githubRepo', 'GITHUB_REPO', 'owner/likelyweather', true),
    githubBranch: setting('githubBranch', 'GITHUB_BRANCH', 'main'),
    monthlyBudgetUsd: Number(setting('monthlyBudgetUsd', 'MONTHLY_BUDGET_USD', '5')),
    contactSender: setting('contactSender', 'CONTACT_FROM', `Likely Weather <noreply@${domainName}>`),
    domain: certificateArn ? { name: domainName, certificateArn } : undefined,
})
