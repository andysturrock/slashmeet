#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {LambdaStack} from '../lib/lambda-stack';
import {DynamoDBStack} from '../lib/dynamodb-stack';
import {getEnv} from '../lib/common';
import {SecretsManagerStack} from '../lib/secretsmanager-stack';

const lambdaVersion = getEnv('LAMBDA_VERSION', false)!;
const customDomainName = getEnv('CUSTOM_DOMAIN_NAME', false)!;
const route53ZoneId = getEnv('R53_ZONE_ID', false)!;
const slashMeetDomainName = `slashmeet.${customDomainName}`;

const app = new cdk.App();

const region = 'eu-west-2';

// TODO maybe unhardcode region, but OK for now as always want London to minimise latency and for data residency purposes.
const dynamoDBStack = new DynamoDBStack(app, 'SlashMeetDynamoDBStack', {
  env: {region}
});

const secretsManagerStack = new SecretsManagerStack(app, 'SlashMeetSecretsManagerStack', {
  env: {region},
  customDomainName,
});

new LambdaStack(app, 'SlashMeetLambdaStack', {
  env: {region},
  slackIdToGCalTokenTable: dynamoDBStack.slackIdToGCalTokenTable,
  stateTable: dynamoDBStack.stateTable,
  slashMeetSecret: secretsManagerStack.slashMeetSecret,
  lambdaVersion,
  customDomainName,
  slashMeetDomainName,
  route53ZoneId
});

