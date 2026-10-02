import {
    aws_budgets as budgets,
    CfnOutput,
    aws_cloudfront as cloudfront,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cloudwatchActions,
    Duration,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_logs as logs,
    aws_cloudfront_origins as origins,
    RemovalPolicy,
    aws_s3 as s3,
    aws_scheduler as scheduler,
    aws_sns as sns,
    aws_sqs as sqs,
    Stack,
    StackProps,
    aws_sns_subscriptions as subscriptions,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { existsSync } from 'node:fs'
import path from 'node:path'

export interface ForecastArenaStackProps extends StackProps {
    // Receives the budget and alarm e-mails.
    alertEmail: string
    // "owner/name"; deploys from GitHub Actions may assume the deploy role only from this repository's branch.
    githubRepo: string
    githubBranch: string
    monthlyBudgetUsd: number
    // 1 keeps the collector single-flight; 0 skips the reservation on accounts whose concurrency limit is still 10.
    collectorReservedConcurrency: number
}

const SSM_PREFIX = '/forecast-arena'
const LOG_RETENTION = logs.RetentionDays.TWO_WEEKS
const WEB_ADAPTER_LAYER_VERSION = 30
const REPO_ROOT = path.resolve(import.meta.dirname, '../..')

// Lambda code comes from what `pnpm build` writes (a directory, or the API's prepared zip); synth fails early if it is
// missing.
const bundle = (relative: string) => {
    const asset = path.join(REPO_ROOT, relative)

    if (!existsSync(asset)) throw new Error(`Missing ${asset}: run \`pnpm build\` before synthesizing the stack`)

    return lambda.Code.fromAsset(asset)
}

export class ForecastArenaStack extends Stack {
    constructor(scope: Construct, id: string, props: ForecastArenaStackProps) {
        super(scope, id, props)

        const ssmParameters = `arn:aws:ssm:${this.region}:${this.account}:parameter${SSM_PREFIX}/*`
        const readSecrets = new iam.PolicyStatement({
            actions: ['ssm:GetParametersByPath', 'ssm:GetParameter', 'ssm:GetParameters'],
            resources: [ssmParameters, `arn:aws:ssm:${this.region}:${this.account}:parameter${SSM_PREFIX}`],
        })
        // SecureStrings use the AWS managed key aws/ssm; decryption is allowed only through SSM.
        const decryptSecrets = new iam.PolicyStatement({
            actions: ['kms:Decrypt'],
            resources: ['*'],
            conditions: { StringEquals: { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` } },
        })

        const alerts = new sns.Topic(this, 'Alerts')
        alerts.addSubscription(new subscriptions.EmailSubscription(props.alertEmail))

        // ---- raw archive ----
        const rawBucket = new s3.Bucket(this, 'RawBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    transitions: [
                        { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: Duration.days(90) },
                    ],
                    expiration: Duration.days(400),
                },
            ],
        })

        const environment = {
            SSM_PREFIX,
            RAW_BUCKET: rawBucket.bucketName,
            NODE_OPTIONS: '--enable-source-maps',
            // One small pool per instance; Neon's pooler multiplexes the instances.
            PG_POOL_MAX: '2',
        }

        const webAdapter = lambda.LayerVersion.fromLayerVersionArn(
            this,
            'WebAdapter',
            `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:${WEB_ADAPTER_LAYER_VERSION}`,
        )

        // ---- web: the standalone Next.js server behind the Lambda Web Adapter (DECISIONS P35) ----
        const web = new lambda.Function(this, 'Web', {
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            code: bundle('apps/web/.next/lambda.zip'),
            handler: 'run.sh',
            memorySize: 1024,
            timeout: Duration.seconds(30),
            layers: [webAdapter],
            environment: {
                AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                AWS_LWA_PORT: '8080',
                PORT: '8080',
                HOSTNAME: '127.0.0.1',
                NODE_OPTIONS: '--enable-source-maps',
            },
            logGroup: new logs.LogGroup(this, 'WebLogs', {
                retention: LOG_RETENTION,
                removalPolicy: RemovalPolicy.DESTROY,
            }),
        })
        const webUrl = web.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM })

        // ---- API: Express behind the Lambda Web Adapter ----
        const api = new lambda.Function(this, 'Api', {
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            code: bundle('apps/api/dist/lambda.zip'),
            handler: 'run.sh',
            memorySize: 1024,
            timeout: Duration.seconds(30),
            layers: [webAdapter],
            environment: {
                ...environment,
                AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                AWS_LWA_PORT: '8080',
                // The server listens on PORT; without it it falls back to the local API_PORT default and the adapter
                // never sees it become ready.
                PORT: '8080',
                AWS_LWA_READINESS_CHECK_PATH: '/api/models',
            },
            logGroup: new logs.LogGroup(this, 'ApiLogs', {
                retention: LOG_RETENTION,
                removalPolicy: RemovalPolicy.DESTROY,
            }),
        })
        api.addToRolePolicy(readSecrets)
        api.addToRolePolicy(decryptSecrets)
        rawBucket.grantRead(api)
        // Preview collects run in the API and archive their raw responses like scheduled runs.
        rawBucket.grantPut(api)
        const apiUrl = api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM })

        // ---- collector ----
        const collector = new lambda.Function(this, 'Collector', {
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            code: bundle('apps/collector/dist'),
            handler: 'handler.handler',
            memorySize: 1024,
            timeout: Duration.minutes(10),
            reservedConcurrentExecutions: props.collectorReservedConcurrency || undefined,
            environment,
            logGroup: new logs.LogGroup(this, 'CollectorLogs', {
                retention: LOG_RETENTION,
                removalPolicy: RemovalPolicy.DESTROY,
            }),
        })
        collector.addToRolePolicy(readSecrets)
        collector.addToRolePolicy(decryptSecrets)
        rawBucket.grantPut(collector)

        // ---- schedule: every 6 hours, 2 retries, then the dead-letter queue ----
        const deadLetters = new sqs.Queue(this, 'CollectorDeadLetters', { retentionPeriod: Duration.days(14) })
        const schedulerRole = new iam.Role(this, 'SchedulerRole', {
            assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
        })
        collector.grantInvoke(schedulerRole)
        deadLetters.grantSendMessages(schedulerRole)
        new scheduler.CfnSchedule(this, 'CollectorSchedule', {
            scheduleExpression: 'cron(0 0/6 * * ? *)',
            scheduleExpressionTimezone: 'UTC',
            flexibleTimeWindow: { mode: 'OFF' },
            target: {
                arn: collector.functionArn,
                roleArn: schedulerRole.roleArn,
                retryPolicy: { maximumRetryAttempts: 2, maximumEventAgeInSeconds: 3600 },
                deadLetterConfig: { arn: deadLetters.queueArn },
            },
        })

        const alarm = (id: string, metric: cloudwatch.IMetric, description: string) =>
            new cloudwatch.Alarm(this, id, {
                metric,
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                alarmDescription: description,
            }).addAlarmAction(new cloudwatchActions.SnsAction(alerts))
        alarm(
            'CollectorErrors',
            collector.metricErrors({ period: Duration.hours(6) }),
            'A collector run failed (after retries, it also lands in the dead-letter queue).',
        )
        alarm(
            'DeadLetters',
            deadLetters.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(15) }),
            'A scheduled collector invocation gave up after its retries.',
        )

        // ---- CloudFront: pages from the web function, /api/* from the API function ----
        // Honors the API's Cache-Control (public reads 5 minutes, everything else no-store).
        const apiCache = new cloudfront.CachePolicy(this, 'ApiCache', {
            defaultTtl: Duration.seconds(0),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.minutes(5),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
        })
        // The viewer's address keys rate limits and the quota. The client's x-amz-content-sha256, which OAC needs to
        // sign POSTs, must not be listed: CloudFront rejects it in a policy and uses it for signing on its own.
        const apiRequest = new cloudfront.OriginRequestPolicy(this, 'ApiRequest', {
            queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
                'CloudFront-Viewer-Address',
                'Content-Type',
            ),
        })
        const webOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(webUrl)
        const distribution = new cloudfront.Distribution(this, 'Site', {
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            // Pages depend on the language cookie and the current time, so they are rendered per request.
            defaultBehavior: {
                origin: webOrigin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            },
            additionalBehaviors: {
                // Content-hashed build assets: cached at the edge for as long as the origin allows.
                '/_next/static/*': {
                    origin: webOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                },
                '/api/*': {
                    origin: origins.FunctionUrlOrigin.withOriginAccessControl(apiUrl),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: apiCache,
                    originRequestPolicy: apiRequest,
                },
            },
        })

        // Function URLs created since October 2025 also need lambda:InvokeFunction; the OAC origin above only grants
        // lambda:InvokeFunctionUrl, so without this CloudFront gets 403 from both functions.
        for (const fn of [web, api]) {
            fn.addPermission('InvokeViaCloudFront', {
                principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
                action: 'lambda:InvokeFunction',
                sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
                invokedViaFunctionUrl: true,
            })
        }

        // ---- deploys from GitHub Actions through OIDC: no stored keys ----
        const github = new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
        })
        const deployRole = new iam.Role(this, 'DeployRole', {
            description: 'Assumed by GitHub Actions to run cdk deploy for this stack',
            maxSessionDuration: Duration.hours(1),
            assumedBy: new iam.WebIdentityPrincipal(github.openIdConnectProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                    'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:ref:refs/heads/${props.githubBranch}`,
                },
            }),
        })
        // CDK deploys through the roles `cdk bootstrap` created; this role may only assume those.
        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['sts:AssumeRole'],
                resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
            }),
        )

        // ---- budget ----
        new budgets.CfnBudget(this, 'MonthlyBudget', {
            budget: {
                budgetType: 'COST',
                timeUnit: 'MONTHLY',
                budgetLimit: { amount: props.monthlyBudgetUsd, unit: 'USD' },
            },
            notificationsWithSubscribers: [
                { threshold: 80, notificationType: 'ACTUAL' },
                { threshold: 100, notificationType: 'FORECASTED' },
            ].map(({ threshold, notificationType }) => ({
                notification: {
                    comparisonOperator: 'GREATER_THAN',
                    threshold,
                    thresholdType: 'PERCENTAGE',
                    notificationType,
                },
                subscribers: [{ subscriptionType: 'EMAIL', address: props.alertEmail }],
            })),
        })

        new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` })
        new CfnOutput(this, 'ApiFunctionUrl', { value: apiUrl.url })
        new CfnOutput(this, 'WebFunctionUrl', { value: webUrl.url })
        new CfnOutput(this, 'DeployRoleArn', { value: deployRole.roleArn })
        new CfnOutput(this, 'RawBucketName', { value: rawBucket.bucketName })
    }
}
