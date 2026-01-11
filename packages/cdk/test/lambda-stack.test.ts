import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { LambdaStack } from '../lib/lambda-stack';

jest.mock('aws-cdk-lib/aws-lambda', () => {
  const original = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...original,
    Code: {
      ...original.Code,
      fromAsset: jest.fn().mockReturnValue(original.Code.fromInline('mock code'))
    }
  };
});

describe('LambdaStack', () => {
  test('LambdaStack creates expected resources', () => {
    const app = new cdk.App();

    // Create dependencies
    const depStack = new cdk.Stack(app, 'DepStack', { env: { region: 'eu-west-2' } });
    const table = new dynamodb.Table(depStack, 'Table', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }
    });
    const secret = new secretsmanager.Secret(depStack, 'Secret');

    const stack = new LambdaStack(app, 'TestStack', {
      env: { region: 'eu-west-2' },
      slackIdToGCalTokenTable: table,
      slackIdToAADTokenTable: table,
      stateTable: table,
      slashMeetSecret: secret,
      lambdaVersion: '1.0.0',
      customDomainName: 'example.com',
      slashMeetDomainName: 'slashmeet.example.com',
      route53ZoneId: 'Z123456789',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const template = Template.fromStack(stack);

    // Verify Lambda functions
    template.resourceCountIs('AWS::Lambda::Function', 10);

    // Verify API Gateway
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: '1_0_0'
    });

    // Verify Route53 record
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'slashmeet.example.com.'
    });
  });
});
