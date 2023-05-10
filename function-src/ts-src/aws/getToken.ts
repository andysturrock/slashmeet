/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {DynamoDBClient, QueryCommand, QueryCommandInput} from '@aws-sdk/client-dynamodb';

export async function getToken(slackUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName: "SlackIdToGCalToken",
    KeyConditionExpression: "slack_id = :slack_id",
    ExpressionAttributeValues: {
      ":slack_id" : {"S" : slackUserId}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].gcal_token.S) {
    return items[0].gcal_token.S;
  }
  else {
    return undefined;
  }
}
