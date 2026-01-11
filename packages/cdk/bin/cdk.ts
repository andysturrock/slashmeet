import { App, RemovalPolicy } from 'aws-cdk-lib';
import 'source-map-support/register';
import { getEnv } from '../lib/common';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { SecretsManagerStack } from '../lib/secretsmanager-stack';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const lambdaVersion = getEnv('LAMBDA_VERSION', false)!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const customDomainName = getEnv('CUSTOM_DOMAIN_NAME', false)!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const route53ZoneId = getEnv('R53_ZONE_ID', false)!;
const slashMeetDomainName = `slashmeet.${customDomainName}`;

const app = new App();

const region = process.env.AWS_REGION || 'eu-west-2';
const account = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT;

const env = { region, account };

const dynamoDBStack = new DynamoDBStack(app, 'SlashMeetDynamoDBStack', {
  env
});

const secretsManagerStack = new SecretsManagerStack(app, 'SlashMeetSecretsManagerStack', {
  env,
  customDomainName,
});

new LambdaStack(app, 'SlashMeetLambdaStack', {
  env,
  slackIdToGCalTokenTable: dynamoDBStack.slackIdToGCalTokenTable,
  slackIdToAADTokenTable: dynamoDBStack.slackIdToAADTokenTable,
  stateTable: dynamoDBStack.stateTable,
  slashMeetSecret: secretsManagerStack.slashMeetSecret,
  lambdaVersion,
  customDomainName,
  slashMeetDomainName,
  route53ZoneId,
  removalPolicy: RemovalPolicy.DESTROY
});

