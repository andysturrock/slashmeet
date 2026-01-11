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

const region = 'eu-west-2';

// TODO maybe unhardcode region, but OK for now as always want London to minimise latency and for data residency purposes.
const dynamoDBStack = new DynamoDBStack(app, 'SlashMeetDynamoDBStack', {
  env: { region }
});

const secretsManagerStack = new SecretsManagerStack(app, 'SlashMeetSecretsManagerStack', {
  env: { region },
  customDomainName,
});

new LambdaStack(app, 'SlashMeetLambdaStack', {
  env: { region },
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

