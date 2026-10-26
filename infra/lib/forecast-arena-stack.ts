import {
    aws_certificatemanager as acm,
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
    aws_sns as sns,
    Stack,
    StackProps,
    aws_sns_subscriptions as subscriptions,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { existsSync } from 'node:fs'
import path from 'node:path'

interface SiteDomain {
    // The bare domain; its www name redirects to it.
    name: string
    // An ACM certificate for the name and its www name, in us-east-1, the only region CloudFront takes them from.
    certificateArn: string
}

export interface ForecastArenaStackProps extends StackProps {
    alertEmail: string
    // "owner/name"; deploys from GitHub Actions may assume the deploy role only from this repository's branch.
    githubRepo: string
    githubBranch: string
    monthlyBudgetUsd: number
    // The contact form's From address, at a domain verified in SES in the stack's region.
    contactSender: string
    // Without it the site answers only on its CloudFront address.
    domain?: SiteDomain
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

// In the SES sandbox the recipient's verified address is checked as an identity too, so the grant covers the account's
// identities in the stack's region rather than the sending domain alone.
const createSendEmailStatement = (stack: Stack) =>
    new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: [`arn:aws:ses:${stack.region}:${stack.account}:identity/*`],
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

// Lambda errors are crashes and timeouts (a request still running at 30 s); errors the API handles are 5xx
// responses, not function errors. A few in a quarter of an hour is worth an e-mail.
const addErrorAlarm = (scope: Construct, id: string, fn: lambda.Function, alerts: sns.ITopic) =>
    new cloudwatch.Alarm(scope, id, {
        metric: fn.metricErrors({ period: Duration.minutes(15) }),
        threshold: 3,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `The ${id.replace('Errors', '').toLowerCase()} function crashed or timed out repeatedly.`,
    }).addAlarmAction(new cloudwatchActions.SnsAction(alerts))

// A viewer-request function on the pages: www.<domain>/<path>?<query> answers with a permanent redirect to the bare
// domain, so the site has one address. CloudFront Functions run their own JavaScript runtime, hence the plain ES5.
const getWwwRedirectCode = (name: string) => `
function handler(event) {
    var request = event.request;
    if (request.headers.host.value !== 'www.${name}') return request;
    var query = Object.keys(request.querystring).map(function (key) {
        var param = request.querystring[key];
        var values = param.multiValue ? param.multiValue.map(function (v) { return v.value; }) : [param.value];
        return values.map(function (value) { return value === '' ? key : key + '=' + value; }).join('&');
    }).join('&');
    var location = 'https://${name}' + request.uri + (query ? '?' + query : '');
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: location } } };
}`

const getDomainSettings = (scope: Construct, domain: SiteDomain) => ({
    domainNames: [domain.name, `www.${domain.name}`],
    certificate: acm.Certificate.fromCertificateArn(scope, 'Certificate', domain.certificateArn),
})

const createDistribution = (
    scope: Construct,
    webUrl: lambda.IFunctionUrl,
    apiUrl: lambda.IFunctionUrl,
    domain: SiteDomain | undefined,
) => {
    // Honors the API's Cache-Control (public reads 5 minutes, everything else no-store).
    const apiCache = new cloudfront.CachePolicy(scope, 'ApiCache', {
        defaultTtl: Duration.seconds(0),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.minutes(5),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
    })
    // The viewer's address keys rate limits and the quota, and its country picks the first visit's chips. The client's
    // x-amz-content-sha256, which OAC needs to sign POSTs, must not be listed: CloudFront rejects it in a policy and
    // uses it for signing on its own.
    const apiRequest = new cloudfront.OriginRequestPolicy(scope, 'ApiRequest', {
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
            'CloudFront-Viewer-Address',
            'CloudFront-Viewer-Country',
            'Content-Type',
        ),
    })
    const webOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(webUrl)
    const wwwRedirect =
        domain &&
        new cloudfront.Function(scope, 'WwwRedirect', {
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromInline(getWwwRedirectCode(domain.name)),
        })

    return new cloudfront.Distribution(scope, 'Site', {
        ...(domain && getDomainSettings(scope, domain)),
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        // Pages depend on the language cookie and the current time, so they are rendered per request.
        defaultBehavior: {
            origin: webOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            // /api/* carries no such policy: the API sets its own headers through helmet.
            responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            functionAssociations: wwwRedirect
                ? [{ function: wwwRedirect, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }]
                : undefined,
        },
        additionalBehaviors: {
            // Content-hashed build assets: cached at the edge for as long as the origin allows.
            '/_next/static/*': {
                origin: webOrigin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
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

        // Amplify Hosting does not support Next.js 16, so the standalone server runs on Lambda.
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
            // The recipient is CONTACT_EMAIL under SSM_PREFIX, which keeps the operator's address out of the template.
            CONTACT_FROM: props.contactSender,
            ...ADAPTER_ENVIRONMENT,
            AWS_LWA_READINESS_CHECK_PATH: '/api/models',
        })
        api.addToRolePolicy(readSecrets)
        api.addToRolePolicy(decryptSecrets)
        api.addToRolePolicy(createSendEmailStatement(this))
        const apiUrl = api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM })

        const alerts = new sns.Topic(this, 'Alerts')
        alerts.addSubscription(new subscriptions.EmailSubscription(props.alertEmail))
        addErrorAlarm(this, 'ApiErrors', api, alerts)
        addErrorAlarm(this, 'WebErrors', web, alerts)

        const distribution = createDistribution(this, webUrl, apiUrl, props.domain)

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

        new CfnOutput(this, 'SiteUrl', {
            value: `https://${props.domain?.name ?? distribution.distributionDomainName}`,
        })
        // The target of the domain's DNS records.
        new CfnOutput(this, 'DistributionDomainName', { value: distribution.distributionDomainName })
        new CfnOutput(this, 'ApiFunctionUrl', { value: apiUrl.url })
        new CfnOutput(this, 'WebFunctionUrl', { value: webUrl.url })
        new CfnOutput(this, 'DeployRoleArn', { value: deployRole.roleArn })
    }
}
