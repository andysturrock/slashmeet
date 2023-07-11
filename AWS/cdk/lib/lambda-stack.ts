import {Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import {LambdaStackProps, getEnv} from './common';

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const customDomainName = getEnv('CUSTOM_DOMAIN_NAME', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const r53ZoneId = getEnv('R53_ZONE_ID', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lambdaVersion = getEnv('LAMBDA_VERSION', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const slackSecret = getEnv('SLACK_SECRET', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clientId = getEnv('CLIENT_ID', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clientSecret = getEnv('CLIENT_SECRET', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const redirectUri = getEnv('REDIRECT_URI', false)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const botUserOauthToken = getEnv('BOT_USER_OAUTH_TOKEN', false)!;

    const slashMeetDomainName = `slashmeet.${customDomainName}`;

    // Create the initial response lambda
    const initialResponseLambda = new lambda.Function(this, "SlashMeetInitialResponseLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../../function-src/dist/lambda.zip"),
      handler: "aws/initialResponseLambda.lambdaHandler",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'SlashMeet-InitialResponseLambda'
    });
    // Add a runtime env var for verifying the request came from Slack
    initialResponseLambda.addEnvironment('SLACK_SECRET', slackSecret);

    // Create the lambda which either creates the authentication response or creates the meeting.
    // This lambda is called from the initial response lambda, not via the API Gateway.
    const authenticateOrCreateMeetingLambda = new lambda.Function(this, "SlashMeetAuthenticateOrCreateMeetingLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../../function-src/dist/lambda.zip"),
      handler: "aws/authenticateOrCreateMeetingLambda.lambdaHandler",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'SlashMeet-AuthenticateOrCreateMeetingLambda',
      timeout: Duration.seconds(5)  // Sometimes takes slightly longer than 3 seconds to execute
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'AuthenticateOrCreateMeetingLambdaEventInvokeConfig', {
      function: authenticateOrCreateMeetingLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the initial response lambda permission to invoke this one
    authenticateOrCreateMeetingLambda.grantInvoke(initialResponseLambda);
    // Allow read access to the DyanamoDB table
    props.slackIdToGCalTokenTable.grantReadData(authenticateOrCreateMeetingLambda);  
    // Add some runtime env vars for creating the Google auth request
    // TODO get the client secret from AWS Secrets Manager
    authenticateOrCreateMeetingLambda.addEnvironment('CLIENT_ID', clientId);
    authenticateOrCreateMeetingLambda.addEnvironment('CLIENT_SECRET', clientSecret);
    authenticateOrCreateMeetingLambda.addEnvironment('REDIRECT_URI', redirectUri);
    authenticateOrCreateMeetingLambda.addEnvironment('BOT_USER_OAUTH_TOKEN', botUserOauthToken);

    // Create the lambda which handles the redirect from the Google auth
    const authenticationCallbackLambda = new lambda.Function(this, "SlashMeetAuthenticationCallbackLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../../function-src/dist/lambda.zip"),
      handler: "aws/authenticationCallbackLambda.lambdaHandler",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'SlashMeet-AuthenticationCallbackLambda'
    });
    // Allow write access to the DyanamoDB table
    props.slackIdToGCalTokenTable.grantReadWriteData(authenticationCallbackLambda);
    // Add some runtime env vars for dealing with the callback from Google auth
    // TODO get the client secret from AWS Secrets Manager
    authenticationCallbackLambda.addEnvironment('CLIENT_ID', clientId);
    authenticationCallbackLambda.addEnvironment('CLIENT_SECRET', clientSecret);
    authenticationCallbackLambda.addEnvironment('REDIRECT_URI', redirectUri);

    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: customDomainName,
      hostedZoneId: r53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
    const acmCertificateForCustomDomain = new acm.DnsValidatedCertificate(this, 'CustomDomainCertificate', {
      domainName: slashMeetDomainName,
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create the custom domain
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: slashMeetDomainName,
      certificate: acmCertificateForCustomDomain,
      endpointType: apigateway.EndpointType.REGIONAL,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2
    });

    // This is the API Gateway which then calls the initial response and auth redirect lambdas
    const api = new apigateway.RestApi(this, "APIGateway", {
      restApiName: "/meet",
      description: "Service for /meet Slack command.",
      deploy: false // create the deployment below
    });

    // By default CDK creates a deployment and a "prod" stage.  That means the URL is something like
    // https://2z2ockh6g5.execute-api.eu-west-2.amazonaws.com/prod/
    // We want to create the stage to match the version id.
    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const versionIdForURL = lambdaVersion.replace(/\./g, '_');
    const apiGatewayDeployment = new apigateway.Deployment(this, 'ApiGatewayDeployment', {
      api: api,
    });
    const stage = new apigateway.Stage(this, 'Stage', {
      deployment: apiGatewayDeployment,
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      stageName: versionIdForURL
    });

    // Connect the API Gateway to the initial response and auth redirect lambdas
    const initialResponseLambdaIntegration = new apigateway.LambdaIntegration(initialResponseLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const authenticationCallbackLambdaIntegration = new apigateway.LambdaIntegration(authenticationCallbackLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const initialResponseResource = api.root.addResource('meet');
    const authenticationCallbackResource = api.root.addResource('redirectUri');
    // And add the methods.
    // TODO add authorizer lambda
    initialResponseResource.addMethod("POST", initialResponseLambdaIntegration);
    authenticationCallbackResource.addMethod("GET", authenticationCallbackLambdaIntegration);

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: slashMeetDomainName,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, {basePath: `${versionIdForURL}`, stage: stage});
  }
}
