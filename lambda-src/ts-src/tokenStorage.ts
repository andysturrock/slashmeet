import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput} from '@aws-sdk/client-dynamodb';

const tableName = "SlashMeet_SlackIdToGCalToken";

export async function getToken(slackUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName: tableName,
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

export async function saveToken(token:string, slackUserId:string) {
  try {
    // The very useful TTL functionality in DynamoDB means we
    // can set a 7 day TTL on storing the refresh token.
    // DynamoDB will automatically delete the token in
    // 7 days from now, so then the user will have to re-authenticate.
    // This is good security and also keeps down storage costs.
    const ttl = new Date(Date.now());
    ttl.setDate(ttl.getDate() + 7);

    const putItemCommandInput: PutItemCommandInput = {
      TableName: tableName,
      Item: {
        slack_id: {S: slackUserId},
        gcal_token: {S: token},
        ttl: {N: `${Math.floor(ttl.getTime() / 1000)}`}
      }
    };

    const ddbClient = new DynamoDBClient({});

    await ddbClient.send(new PutItemCommand(putItemCommandInput));

  }
  catch (err) {
    if(err instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.error(`Error: ${err.stack}`);
    } else {
      console.error(`Error: ${JSON.stringify(err)}`);
    }
  }
}
