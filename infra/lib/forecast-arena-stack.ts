import {
    aws_budgets as budgets,
    CfnOutput,
    aws_cloudfront as cloudfront,
    Duration,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_logs as logs,
    aws_cloudfront_origins as origins,
    RemovalPolicy,
    Stack,
    StackProps,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { existsSync } from 'node:fs'
import path from 'node:path'

export interface ForecastArenaStackProps extends StackProps {
    // Receives the budget e-mails.
    alertEmail: string
    // "owner/name"; deploys from GitHub Actions may assume the deploy role only from this repository's branch.
    githubRepo: string
    githubBranch: string
    monthlyBudgetUsd: number
}

const SSM_PREFIX = '/forecast-arena'
const LOG_RETENTION = logs.RetentionDays.TWO_WEEKS
const WEB_ADAPTER_LAYER_VERSION = 30
const REPO_ROOT = path.resolve(import.meta.dirname, '../..')

// Read by the Lambda Web Adapter. The server listens on PORT; without it the API falls back to the local API_PORT
// default and the adapter never sees it become ready.
const ADAPTER_ENVIRONMENT = {
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
    AWS_LWA_PORT: '8080',
    PORT: '8080',
}

// Lambda code comes from what `pnpm build` writes (a directory, or the API's prepared zip); synth fails early if it is
// missing.
const bundle = (relative: string) => {
    const asset = path.join(REPO_ROOT, relative)

    if (!existsSync(asset)) throw new Error(`Missing ${asset}: run \`pnpm build\` before synthesizing the stack`)

    return lambda.Code.fromAsset(asset)
}

const createLogGroup = (scope: Construct, id: string) =>
    new logs.LogGroup(scope, id, { retention: LOG_RETENTION, removalPolicy: RemovalPolicy.DESTROY })

const createReadSecretsStatement = (stack: Stack) =>
    new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath', 'ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
            `arn:aws:ssm:${stack.region}:${stack.account}:parameter${SSM_PREFIX}/*`,
            `arn:aws:ssm:${stack.region}:${stack.account}:parameter${SSM_PREFIX}`,
        ],
    })

// SecureStrings use the AWS managed key aws/ssm; decryption is allowed only through SSM.
const createDecryptSecretsStatement = (stack: Stack) =>
    new iam.PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: ['*'],
        conditions: { StringEquals: { 'kms:ViaService': `ssm.${stack.region}.amazonaws.com` } },
    })

// The web app and the API are HTTP servers that the Lambda Web Adapter starts through run.sh.
const createAdapterFunction = (
    scope: Construct,
    id: string,
    code: lambda.Code,
    adapter: lambda.ILayerVersion,
    environment: Record<string, string>,
) =>
    new lambda.Function(scope, id, {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        code,
        handler: 'run.sh',
        memorySize: 1024,
        timeout: Duration.seconds(30),
        layers: [adapter],
        environment,
        logGroup: createLogGroup(scope, `${id}Logs`),
    })

// Pages come from the web function and /api/* from the API function.
const createDistribution = (scope: Construct, webUrl: lambda.IFunctionUrl, apiUrl: lambda.IFunctionUrl) => {
    // Honors the API's Cache-Control (public reads 5 minutes, everything else no-store).
    const apiCache = new cloudfront.CachePolicy(scope, 'ApiCache', {
        defaultTtl: Duration.seconds(0),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.minutes(5),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
    })
    // The viewer's address keys rate limits and the quota. The client's x-amz-content-sha256, which OAC needs to
    // sign POSTs, must not be listed: CloudFront rejects it in a policy and uses it for signing on its own.
    const apiRequest = new cloudfront.OriginRequestPolicy(scope, 'ApiRequest', {
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Address', 'Content-Type'),
    })
    const webOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(webUrl)

    return new cloudfront.Distribution(scope, 'Site', {
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
}

// GitHub Actions deploys through OIDC, so no keys are stored.
const createDeployRole = (stack: Stack, { githubRepo, githubBranch }: ForecastArenaStackProps) => {
    const github = new iam.OpenIdConnectProvider(stack, 'GitHubOidc', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
    })
    const deployRole = new iam.Role(stack, 'DeployRole', {
        description: 'Assumed by GitHub Actions to run cdk deploy for this stack',
        maxSessionDuration: Duration.hours(1),
        assumedBy: new iam.WebIdentityPrincipal(github.openIdConnectProviderArn, {
            StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub': `repo:${githubRepo}:ref:refs/heads/${githubBranch}`,
            },
        }),
    })

    // CDK deploys through the roles `cdk bootstrap` created; this role may only assume those.
    deployRole.addToPolicy(
        new iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [`arn:aws:iam::${stack.account}:role/cdk-*`],
        }),
    )

    return deployRole
}

const createMonthlyBudget = (scope: Construct, { monthlyBudgetUsd, alertEmail }: ForecastArenaStackProps) =>
    new budgets.CfnBudget(scope, 'MonthlyBudget', {
        budget: {
            budgetType: 'COST',
            timeUnit: 'MONTHLY',
            budgetLimit: { amount: monthlyBudgetUsd, unit: 'USD' },
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
            subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        })),
    })

export class ForecastArenaStack extends Stack {
    constructor(scope: Construct, id: string, props: ForecastArenaStackProps) {
        super(scope, id, props)

        const readSecrets = createReadSecretsStatement(this)
        const decryptSecrets = createDecryptSecretsStatement(this)

        const webAdapter = lambda.LayerVersion.fromLayerVersionArn(
            this,
            'WebAdapter',
            `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:${WEB_ADAPTER_LAYER_VERSION}`,
        )

        // The standalone Next.js server (DECISIONS P35).
        const web = createAdapterFunction(this, 'Web', bundle('apps/web/.next/lambda.zip'), webAdapter, {
            ...ADAPTER_ENVIRONMENT,
            HOSTNAME: '127.0.0.1',
            NODE_OPTIONS: '--enable-source-maps',
        })
        const webUrl = web.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM })

        const api = createAdapterFunction(this, 'Api', bundle('apps/api/dist/lambda.zip'), webAdapter, {
            SSM_PREFIX,
            NODE_OPTIONS: '--enable-source-maps',
            // One small pool per instance; Neon's pooler multiplexes the instances.
            PG_POOL_MAX: '2',
            ...ADAPTER_ENVIRONMENT,
            AWS_LWA_READINESS_CHECK_PATH: '/api/models',
        })
        api.addToRolePolicy(readSecrets)
        api.addToRolePolicy(decryptSecrets)
        const apiUrl = api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM })

        const distribution = createDistribution(this, webUrl, apiUrl)

        // Function URLs created since October 2025 also need lambda:InvokeFunction; the OAC origin only grants
        // lambda:InvokeFunctionUrl, so without this CloudFront gets 403 from both functions.
        for (const fn of [web, api]) {
            fn.addPermission('InvokeViaCloudFront', {
                principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
                action: 'lambda:InvokeFunction',
                sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
                invokedViaFunctionUrl: true,
            })
        }

        const deployRole = createDeployRole(this, props)

        createMonthlyBudget(this, props)

        new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` })
        new CfnOutput(this, 'ApiFunctionUrl', { value: apiUrl.url })
        new CfnOutput(this, 'WebFunctionUrl', { value: webUrl.url })
        new CfnOutput(this, 'DeployRoleArn', { value: deployRole.roleArn })
    }
}
