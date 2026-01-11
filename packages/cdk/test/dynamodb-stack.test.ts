import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DynamoDBStack } from '../lib/dynamodb-stack';

describe('DynamoDBStack', () => {
  test('DynamoDB tables are created', () => {
    const app = new cdk.App();
    const stack = new DynamoDBStack(app, 'TestStack', {
      env: { region: 'eu-west-2' }
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'SlashMeet_SlackIdToGCalToken',
      KeySchema: [
        {
          AttributeName: 'slack_id',
          KeyType: 'HASH'
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'slack_id',
          AttributeType: 'S'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'SlashMeet_SlackIdToAADToken',
      KeySchema: [
        {
          AttributeName: 'slack_id',
          KeyType: 'HASH'
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'slack_id',
          AttributeType: 'S'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'SlashMeet_State',
      KeySchema: [
        {
          AttributeName: 'nonce',
          KeyType: 'HASH'
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'nonce',
          AttributeType: 'S'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'expiry',
        Enabled: true
      }
    });
  });
});
