import { Duration, Stack } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { LambdaStackProps } from './common';

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const lambdaVersionIdForURL = props.lambdaVersion.replace(/\./g, '_');

    // Common props for all lambdas, so define them once here.
    const allLambdaProps = {
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
    };

    // The lambda for handling the callback for the Slack install
    const handleSlackAuthRedirectLambda = new lambda.Function(this, "handleSlackAuthRedirectLambda", {
      handler: "handleSlackAuthRedirect.handleSlackAuthRedirect",
      functionName: 'SlashMeet-handleSlackAuthRedirect',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleSlackAuthRedirect"),
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleSlackAuthRedirectLambda);

    // Create the initial response lambda
    const handleSlashCommand = new lambda.Function(this, "handleSlashCommand", {
      handler: "handleSlashCommand.handleSlashCommand",
      functionName: 'SlashMeet-handleSlashCommand',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleSlashCommand"),
      memorySize: 1024,
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleSlashCommand);
    // Allow access to the DynamoDB tables
    props.slackIdToGCalTokenTable.grantReadData(handleSlashCommand);
    props.slackIdToAADTokenTable.grantReadData(handleSlashCommand);

    // Create the lambda which creates the dialog box.
    // This lambda is called from the initial response lambda, not via the API Gateway.
    const handleMeetCommandLambda = new lambda.Function(this, "handleMeetCommandLambda", {
      handler: "handleMeetCommand.handleMeetCommand",
      functionName: 'SlashMeet-handleMeetCommandLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleMeetCommand"),
      memorySize: 1024,
      ...allLambdaProps
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleMeetCommandLambdaEventInvokeConfig', {
      function: handleMeetCommandLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the initial response lambda permission to invoke this one
    handleMeetCommandLambda.grantInvoke(handleSlashCommand);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleMeetCommandLambda);
    // It needs to check whether the user is logged into AAD
    props.slackIdToAADTokenTable.grantReadData(handleMeetCommandLambda);

    // Create the lambda which handles the login to AAD/Entra and Google.
    // This lambda is called from the initial response lambda, not via the API Gateway.
    const handleLoginCommandLambda = new lambda.Function(this, "handleLoginCommandLambda", {
      handler: "handleLoginCommand.handleLoginCommand",
      functionName: 'SlashMeet-handleLoginCommandLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleLoginCommand"),
      memorySize: 1024,
      ...allLambdaProps
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleLoginCommandLambdaEventInvokeConfig', {
      function: handleLoginCommandLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the initial response lambda permission to invoke this one
    handleLoginCommandLambda.grantInvoke(handleSlashCommand);
    // Allow access to the DynamoDB tables
    props.slackIdToGCalTokenTable.grantReadData(handleLoginCommandLambda);
    props.slackIdToAADTokenTable.grantReadData(handleLoginCommandLambda);
    props.stateTable.grantReadWriteData(handleLoginCommandLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleLoginCommandLambda);

    // Create the lambda which handles the logout from AAD/Entra and Google.
    // This lambda is called from the initial response lambda, not via the API Gateway.
    const handleLogoutCommandLambda = new lambda.Function(this, "handleLogoutCommandLambda", {
      handler: "handleLogoutCommand.handleLogoutCommand",
      functionName: 'SlashMeet-handleLogoutCommandLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleLogoutCommand"),
      memorySize: 1024,
      ...allLambdaProps
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleLogoutCommandLambdaEventInvokeConfig', {
      function: handleLogoutCommandLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the initial response lambda permission to invoke this one
    handleLogoutCommandLambda.grantInvoke(handleSlashCommand);
    // Allow access to the DynamoDB tables
    props.slackIdToGCalTokenTable.grantReadWriteData(handleLogoutCommandLambda);
    props.slackIdToAADTokenTable.grantReadWriteData(handleLogoutCommandLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleLogoutCommandLambda);

    // Create the lambda which handles the redirect from the Google auth
    const handleGoogleAuthRedirectLambda = new lambda.Function(this, "handleGoogleAuthRedirectLambda", {
      handler: "handleGoogleAuthRedirect.handleGoogleAuthRedirect",
      functionName: 'SlashMeet-handleGoogleAuthRedirectLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleGoogleAuthRedirect"),
      memorySize: 512,
      ...allLambdaProps
    });
    // Allow access to the DynamoDB tables
    props.slackIdToGCalTokenTable.grantReadWriteData(handleGoogleAuthRedirectLambda);
    props.stateTable.grantReadWriteData(handleGoogleAuthRedirectLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleGoogleAuthRedirectLambda);

    // Create the lambda which handles the redirect from the AAD/Entra auth
    const handleAADAuthRedirectLambda = new lambda.Function(this, "handleAADAuthRedirectLambda", {
      handler: "handleAADAuthRedirect.handleAADAuthRedirect",
      functionName: 'SlashMeet-handleAADAuthRedirectLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleAADAuthRedirect"),
      memorySize: 512,
      ...allLambdaProps
    });
    // Allow access to the DynamoDB tables
    props.slackIdToAADTokenTable.grantReadWriteData(handleAADAuthRedirectLambda);
    props.stateTable.grantReadWriteData(handleAADAuthRedirectLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleAADAuthRedirectLambda);

    // Create the lambda for handling interactions.
    const handleInteractiveEndpointLambda = new lambda.Function(this, "handleInteractiveEndpointLambda", {
      handler: "handleInteractiveEndpoint.handleInteractiveEndpoint",
      functionName: 'SlashMeet-handleInteractiveEndpoint',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleInteractiveEndpoint"),
      memorySize: 512,
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleInteractiveEndpointLambda);

    // Create the lambda which calls the Google and MS APIs to create the meetings
    const handleCreateMeetingsLambda = new lambda.Function(this, "handleCreateMeetingsLambda", {
      handler: "handleCreateMeetings.handleCreateMeetings",
      functionName: 'SlashMeet-handleCreateMeetingsLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleCreateMeetings"),
      memorySize: 1024,
      ...allLambdaProps
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleCreateMeetingsLambdaEventInvokeConfig', {
      function: handleCreateMeetingsLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the handle interactive response lambda permission to invoke this one
    handleCreateMeetingsLambda.grantInvoke(handleInteractiveEndpointLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleCreateMeetingsLambda);
    // Allow access to the DynamoDB tables
    props.slackIdToGCalTokenTable.grantReadData(handleCreateMeetingsLambda);
    // Needs to be able to delete from this table in event of failed authorisation.
    props.slackIdToAADTokenTable.grantReadWriteData(handleCreateMeetingsLambda);

    // Create the lambda for handling events.
    const handleEventsEndpointLambda = new lambda.Function(this, "handleEventsEndpointLambda", {
      handler: "handleEventsEndpoint.handleEventsEndpoint",
      functionName: 'SlashMeet-handleEventsEndpoint',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleEventsEndpoint"),
      memorySize: 512,
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleEventsEndpointLambda);

    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: props.customDomainName,
      hostedZoneId: props.route53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const acmCertificateForCustomDomain = new acm.DnsValidatedCertificate(this, 'CustomDomainCertificate', {
      domainName: props.slashMeetDomainName,
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create the custom domain
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: props.slashMeetDomainName,
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
    const apiGatewayDeployment = new apigateway.Deployment(this, 'ApiGatewayDeployment', {
      api: api,
    });
    const stage = new apigateway.Stage(this, 'Stage', {
      deployment: apiGatewayDeployment,
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      stageName: lambdaVersionIdForURL
    });

    // Connect the API Gateway to the lambdas
    const handleSlackAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleSlackAuthRedirectLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const handleSlashCommandLambdaIntegration = new apigateway.LambdaIntegration(handleSlashCommand, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const handleGoogleAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleGoogleAuthRedirectLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const handleAADAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleAADAuthRedirectLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const handleInteractiveEndpointLambdaIntegration = new apigateway.LambdaIntegration(handleInteractiveEndpointLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const handleEventsEndpointLambdaIntegration = new apigateway.LambdaIntegration(handleEventsEndpointLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const initialResponseResource = api.root.addResource('meet');
    const gcpAuthenticationCallbackResource = api.root.addResource('google-oauth-redirect');
    const aadAuthenticationCallbackResource = api.root.addResource('aad-oauth-redirect');
    const handleSlackAuthRedirectResource = api.root.addResource('slack-oauth-redirect');
    const handleInteractiveEndpointResource = api.root.addResource('interactive-endpoint');
    const handleEventsEndpointResource = api.root.addResource('events-endpoint');
    // And add the methods.
    initialResponseResource.addMethod("POST", handleSlashCommandLambdaIntegration);
    gcpAuthenticationCallbackResource.addMethod("GET", handleGoogleAuthRedirectLambdaIntegration);
    aadAuthenticationCallbackResource.addMethod("POST", handleAADAuthRedirectLambdaIntegration);
    handleSlackAuthRedirectResource.addMethod("GET", handleSlackAuthRedirectLambdaIntegration);
    handleInteractiveEndpointResource.addMethod("POST", handleInteractiveEndpointLambdaIntegration);
    handleEventsEndpointResource.addMethod("POST", handleEventsEndpointLambdaIntegration);

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: props.slashMeetDomainName,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, { basePath: lambdaVersionIdForURL, stage: stage });
  }
}
