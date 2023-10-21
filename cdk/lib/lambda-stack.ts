import {Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import {LambdaStackProps} from './common';

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
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
    };

    // The lambda for handling the callback for the Slack install
    const handleSlackAuthRedirectLambda = new lambda.Function(this, "SlashMeetHandleSlackAuthRedirectLambda", {
      handler: "handleSlackAuthRedirect.handleSlackAuthRedirect",
      functionName: 'SlashMeet-handleSlackAuthRedirect',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleSlackAuthRedirect"),
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(handleSlackAuthRedirectLambda);

    // Create the initial response lambda
    const initialResponseLambda = new lambda.Function(this, "SlashMeetInitialResponseLambda", {
      handler: "initialResponseLambda.lambdaHandler",
      functionName: 'SlashMeet-InitialResponseLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/initialResponseLambda"),
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(initialResponseLambda);

    // Create the lambda which either creates the authentication response or creates the meeting.
    // This lambda is called from the initial response lambda, not via the API Gateway.
    const authenticateOrCreateMeetingLambda = new lambda.Function(this, "SlashMeetAuthenticateOrCreateMeetingLambda", {
      handler: "authenticateOrCreateMeetingLambda.lambdaHandler",
      functionName: 'SlashMeet-AuthenticateOrCreateMeetingLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/authenticateOrCreateMeetingLambda"),
      memorySize: 512,
      ...allLambdaProps
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
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(authenticateOrCreateMeetingLambda);

    // Create the lambda which handles the redirect from the Google auth
    const authenticationCallbackLambda = new lambda.Function(this, "SlashMeetAuthenticationCallbackLambda", {
      handler: "authenticationCallbackLambda.lambdaHandler",
      functionName: 'SlashMeet-AuthenticationCallbackLambda',
      code: lambda.Code.fromAsset("../lambda-src/dist/authenticationCallbackLambda"),
      memorySize: 512,
      ...allLambdaProps
    });
    // Allow write access to the DyanamoDB table
    props.slackIdToGCalTokenTable.grantReadWriteData(authenticationCallbackLambda);
    // Allow read access to the secret it needs
    props.slashMeetSecret.grantRead(authenticationCallbackLambda);

    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: props.customDomainName,
      hostedZoneId: props.route53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
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

    // Connect the API Gateway to the initial response and auth redirect lambdas
    const handleSlackAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleSlackAuthRedirectLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const initialResponseLambdaIntegration = new apigateway.LambdaIntegration(initialResponseLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const authenticationCallbackLambdaIntegration = new apigateway.LambdaIntegration(authenticationCallbackLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const initialResponseResource = api.root.addResource('meet');
    const authenticationCallbackResource = api.root.addResource('redirectUri');
    const handleSlackAuthRedirectResource = api.root.addResource('slack-oauth-redirect');
    // And add the methods.
    // TODO add authorizer lambda
    initialResponseResource.addMethod("POST", initialResponseLambdaIntegration);
    authenticationCallbackResource.addMethod("GET", authenticationCallbackLambdaIntegration);
    handleSlackAuthRedirectResource.addMethod("GET", handleSlackAuthRedirectLambdaIntegration);

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: props.slashMeetDomainName,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, {basePath: `${lambdaVersionIdForURL}`, stage: stage});
  }
}
