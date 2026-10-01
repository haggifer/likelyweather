import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { ForecastArenaStack } from '../lib/forecast-arena-stack'

// Needs the Lambda bundles: run `pnpm build` first (Turbo builds them before this package's tests).
const template = Template.fromStack(
    new ForecastArenaStack(new App(), 'Test', {
        env: { account: '111111111111', region: 'eu-central-1' },
        alertEmail: 'alerts@example.com',
        githubRepo: 'owner/forecast-arena',
        githubBranch: 'main',
        monthlyBudgetUsd: 5,
        collectorReservedConcurrency: 1,
    }),
)

describe('ForecastArenaStack', () => {
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

    it('runs the collector every 6 hours with two retries and a dead-letter queue, one at a time', () => {
        template.hasResourceProperties('AWS::Scheduler::Schedule', {
            ScheduleExpression: 'cron(0 0/6 * * ? *)',
            Target: Match.objectLike({
                RetryPolicy: { MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 3600 },
                DeadLetterConfig: Match.anyValue(),
            }),
        })
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'handler.handler',
            ReservedConcurrentExecutions: 1,
        })
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

    it('lets only the repository default branch assume the deploy role', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    Match.objectLike({
                        Condition: {
                            StringEquals: {
                                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                                'token.actions.githubusercontent.com:sub':
                                    'repo:owner/forecast-arena:ref:refs/heads/main',
                            },
                        },
                    }),
                ],
            },
        })
    })

    it('keeps logs for two weeks and the raw archive private, moving it to Infrequent Access at 90 days', () => {
        template.allResourcesProperties('AWS::Logs::LogGroup', { RetentionInDays: 14 })
        template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
            LifecycleConfiguration: {
                Rules: [
                    Match.objectLike({
                        ExpirationInDays: 400,
                        Transitions: [{ StorageClass: 'STANDARD_IA', TransitionInDays: 90 }],
                    }),
                ],
            },
        })
    })
})

describe('ForecastArenaStack web', () => {
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

    it('forwards the viewer address to the API without headers CloudFront reserves for signing', () => {
        template.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
            OriginRequestPolicyConfig: Match.objectLike({
                HeadersConfig: {
                    HeaderBehavior: 'whitelist',
                    Headers: ['CloudFront-Viewer-Address', 'Content-Type'],
                },
            }),
        })
    })
})
