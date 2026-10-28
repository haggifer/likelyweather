import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { LikelyWeatherStack, LikelyWeatherStackProps } from '../lib/likelyweather-stack'

const CERTIFICATE_ARN = 'arn:aws:acm:us-east-1:111111111111:certificate/00000000-0000-0000-0000-000000000000'

const PROPS: LikelyWeatherStackProps = {
    env: { account: '111111111111', region: 'eu-central-1' },
    contactEmail: 'alerts@example.com',
    githubRepo: 'owner@1/likelyweather@2',
    githubBranch: 'main',
    monthlyBudgetUsd: 5,
    contactSender: 'Likely Weather <noreply@likelyweather.com>',
}

// Needs the Lambda bundles: run `pnpm build` first (Turbo builds them before this package's tests).
const template = Template.fromStack(new LikelyWeatherStack(new App(), 'Test', PROPS))
const domainTemplate = Template.fromStack(
    new LikelyWeatherStack(new App(), 'Domain', {
        ...PROPS,
        domain: { name: 'likelyweather.com', certificateArn: CERTIFICATE_ARN },
    }),
)

interface ViewerRequest {
    uri: string
    headers: { host: { value: string } }
    querystring: Record<string, { value: string; multiValue?: { value: string }[] }>
}

// The redirect function as CloudFront runs it: the synthesized code, called with a viewer request.
const runWwwRedirect = (request: ViewerRequest) => {
    const [fn] = Object.values(domainTemplate.findResources('AWS::CloudFront::Function'))
    const handler = new Function(`${fn.Properties.FunctionCode}; return handler`)()

    return handler({ request })
}

describe('LikelyWeatherStack', () => {
    it('creates nothing with an always-on cost: no VPC, NAT gateway, ElastiCache or RDS', () => {
        for (const type of [
            'AWS::EC2::VPC',
            'AWS::EC2::NatGateway',
            'AWS::ElastiCache::ServerlessCache',
            'AWS::RDS::DBInstance',
        ]) {
            template.resourceCountIs(type, 0)
        }
    })

    it('sets a $5 monthly budget with e-mail alerts', () => {
        template.hasResourceProperties('AWS::Budgets::Budget', {
            Budget: { BudgetLimit: { Amount: 5, Unit: 'USD' }, TimeUnit: 'MONTHLY', BudgetType: 'COST' },
            NotificationsWithSubscribers: Match.arrayWith([
                Match.objectLike({ Subscribers: [{ SubscriptionType: 'EMAIL', Address: 'alerts@example.com' }] }),
            ]),
        })
    })

    it('has no collector function, schedule or queue: forecasts are fetched on demand', () => {
        template.resourcePropertiesCountIs('AWS::Lambda::Function', { Handler: 'handler.handler' }, 0)
        for (const type of ['AWS::Scheduler::Schedule', 'AWS::SQS::Queue']) template.resourceCountIs(type, 0)
    })

    it('e-mails an alarm when the web or API function keeps crashing or timing out', () => {
        template.resourcePropertiesCountIs('AWS::CloudWatch::Alarm', { MetricName: 'Errors', Threshold: 3 }, 2)
        template.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'alerts@example.com' })
    })

    it('runs the API behind the Lambda Web Adapter with an IAM-protected function URL', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'run.sh',
            Architectures: ['arm64'],
            Runtime: 'nodejs22.x',
            Environment: {
                Variables: Match.objectLike({
                    AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                    SSM_PREFIX: '/forecast-arena',
                }),
            },
        })
        template.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'AWS_IAM' })
    })

    it('gives the API a full vCPU and a bundle that starts without loading source maps, and leaves the web at 1024 MB', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            MemorySize: 1769,
            Environment: {
                Variables: Match.objectLike({ SSM_PREFIX: '/forecast-arena', NODE_OPTIONS: Match.absent() }),
            },
        })
        template.hasResourceProperties('AWS::Lambda::Function', {
            MemorySize: 1024,
            Environment: { Variables: Match.objectLike({ HOSTNAME: '127.0.0.1' }) },
        })
    })

    it('lets the API send the contact form through SES from the configured sender', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: Match.objectLike({
                    CONTACT_EMAIL: 'alerts@example.com',
                    CONTACT_FROM: 'Likely Weather <noreply@likelyweather.com>',
                }),
            },
        })
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: 'ses:SendEmail',
                        Resource: 'arn:aws:ses:eu-central-1:111111111111:identity/*',
                        Condition: { StringEquals: { 'ses:FromAddress': 'noreply@likelyweather.com' } },
                    }),
                ]),
            },
        })
    })

    it('lets only the repository default branch assume the deploy role', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    Match.objectLike({
                        Condition: {
                            StringEquals: {
                                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                                'token.actions.githubusercontent.com:sub':
                                    'repo:owner@1/likelyweather@2:ref:refs/heads/main',
                            },
                        },
                    }),
                ],
            },
        })
    })

    it('keeps logs for two weeks and stores no files', () => {
        template.allResourcesProperties('AWS::Logs::LogGroup', { RetentionInDays: 14 })
        template.resourceCountIs('AWS::S3::Bucket', 0)
    })
})

describe('LikelyWeatherStack web', () => {
    it('serves pages from a web function behind the Web Adapter, with only static assets cached at the edge', () => {
        template.resourcePropertiesCountIs('AWS::Lambda::Function', { Handler: 'run.sh' }, 2)
        template.resourcePropertiesCountIs('AWS::Lambda::Url', { AuthType: 'AWS_IAM' }, 2)
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                CacheBehaviors: Match.arrayWith([
                    Match.objectLike({ PathPattern: '/_next/static/*' }),
                    Match.objectLike({ PathPattern: '/api/*' }),
                ]),
            }),
        })
    })

    it('starts both Web Adapter apps on the port the adapter waits for', () => {
        template.resourcePropertiesCountIs(
            'AWS::Lambda::Function',
            {
                Handler: 'run.sh',
                Environment: { Variables: Match.objectLike({ AWS_LWA_PORT: '8080', PORT: '8080' }) },
            },
            2,
        )
    })

    it('lets CloudFront invoke both function URLs, which needs lambda:InvokeFunction as well', () => {
        template.resourcePropertiesCountIs(
            'AWS::Lambda::Permission',
            {
                Action: 'lambda:InvokeFunction',
                Principal: 'cloudfront.amazonaws.com',
                InvokedViaFunctionUrl: true,
            },
            2,
        )
    })

    it('adds the managed security headers to pages and static assets', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                DefaultCacheBehavior: Match.objectLike({ ResponseHeadersPolicyId: Match.anyValue() }),
            }),
        })
    })

    it('answers only on the CloudFront address without a domain', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({ Aliases: Match.absent(), ViewerCertificate: Match.absent() }),
        })
        template.resourceCountIs('AWS::CloudFront::Function', 0)
    })

    it('forwards the viewer address to the API without headers CloudFront reserves for signing', () => {
        template.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
            OriginRequestPolicyConfig: Match.objectLike({
                HeadersConfig: {
                    HeaderBehavior: 'whitelist',
                    Headers: ['CloudFront-Viewer-Address', 'CloudFront-Viewer-Country', 'Content-Type'],
                },
            }),
        })
    })
})

describe('LikelyWeatherStack domain', () => {
    it('serves the domain and its www name with the given certificate over SNI', () => {
        domainTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                Aliases: ['likelyweather.com', 'www.likelyweather.com'],
                ViewerCertificate: Match.objectLike({
                    AcmCertificateArn: CERTIFICATE_ARN,
                    SslSupportMethod: 'sni-only',
                }),
            }),
        })
    })

    it('runs the www redirect on page requests only', () => {
        domainTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                DefaultCacheBehavior: Match.objectLike({
                    FunctionAssociations: [Match.objectLike({ EventType: 'viewer-request' })],
                }),
                CacheBehaviors: Match.arrayWith([
                    Match.objectLike({ PathPattern: '/api/*', FunctionAssociations: Match.absent() }),
                ]),
            }),
        })
    })

    it('reports the domain as the site URL and the CloudFront name for DNS', () => {
        domainTemplate.hasOutput('SiteUrl', { Value: 'https://likelyweather.com' })
        domainTemplate.hasOutput('DistributionDomainName', Match.anyValue())
    })

    it('redirects www to the bare domain, keeping the path and query', () => {
        const response = runWwwRedirect({
            uri: '/archive',
            headers: { host: { value: 'www.likelyweather.com' } },
            querystring: {
                city: { value: 'kyiv' },
                v: { value: 'wind', multiValue: [{ value: 'wind' }, { value: 'gusts' }] },
            },
        })

        expect(response).toEqual({
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: { location: { value: 'https://likelyweather.com/archive?city=kyiv&v=wind&v=gusts' } },
        })
    })

    it('passes requests for the bare domain through unchanged', () => {
        const request = { uri: '/', headers: { host: { value: 'likelyweather.com' } }, querystring: {} }

        expect(runWwwRedirect(request)).toBe(request)
    })
})
