import {DeleteItemCommand, DeleteItemCommandInput, DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput} from '@aws-sdk/client-dynamodb';

const gcalTokenTableName = "SlashMeet_SlackIdToGCalToken";
const aadTokenTableName = "SlashMeet_SlackIdToAADToken";

export async function getGCalToken(slackUserId: string) {
  return await getToken(gcalTokenTableName, slackUserId);
}

export async function saveGCalToken(token:string, slackUserId:string) {
  return await saveToken(gcalTokenTableName, token, slackUserId);
}

export async function getAADToken(slackUserId: string) {
  return await getToken(aadTokenTableName, slackUserId);
}

export async function saveAADToken(token:string, slackUserId:string) {
  return await saveToken(aadTokenTableName, token, slackUserId);
}

export async function deleteGCalToken(slackUserId:string) {
  return await deleteToken(gcalTokenTableName, slackUserId);
}

export async function deleteAADToken(slackUserId:string) {
  return await deleteToken(aadTokenTableName, slackUserId);
}

async function getToken(tableName: string, slackUserId: string) {
  const params: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: "slack_id = :slack_id",
    ExpressionAttributeValues: {
      ":slack_id" : {"S" : slackUserId}
    }
  };

  const ddbClient = new DynamoDBClient({});
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].refresh_token.S) {
    return items[0].refresh_token.S;
  }
  else {
    return undefined;
  }
}

async function saveToken(tableName: string, token:string, slackUserId:string) {
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
      refresh_token: {S: token},
      ttl: {N: `${Math.floor(ttl.getTime() / 1000)}`}
    }
  };

  const ddbClient = new DynamoDBClient({});
  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}

async function deleteToken(tableName: string, slackUserId:string) {
  const deleteItemCommandInput: DeleteItemCommandInput = {
    TableName: tableName,
    Key: {
      ":slack_id" : {"S" : slackUserId}
    }
  };

  const ddbClient = new DynamoDBClient({});
  await ddbClient.send(new DeleteItemCommand(deleteItemCommandInput));
}