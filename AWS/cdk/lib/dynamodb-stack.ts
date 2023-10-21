import {Stack, StackProps, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends Stack {
  public readonly slackIdToGCalTokenTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.slackIdToGCalTokenTable = new dynamodb.Table(this, 'SlackIdToGCalTokenTable', {
      tableName: "SlackIdToGCalToken",
      partitionKey: {name: 'slack_id', type: dynamodb.AttributeType.STRING},
      sortKey: {name: "gcal_token", type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create exports from the CF template so that CF knows that other stacks depend on this stack.
    this.exportValue(this.slackIdToGCalTokenTable.tableArn);
  }
}
