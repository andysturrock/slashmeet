#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {LambdaStack} from '../lib/lambda-stack';
import {DynamoDBStack} from '../lib/dynamodb-stack';

const app = new cdk.App();
const dynamoDBStack = new DynamoDBStack(app, 'SlashMeetDynamoDBStack');

// TODO maybe unhardcode this, but OK for now as always want London to minimise latency and for data residency purposes.
new LambdaStack(app, 'SlashMeetLambdaStack', {
  env: {region: 'eu-west-2'},
  slackIdToGCalTokenTable: dynamoDBStack.slackIdToGCalTokenTable
});

