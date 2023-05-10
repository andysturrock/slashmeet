import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {generateLoggedInHTML} from '../generateLoggedInHTML';
import {Auth} from 'googleapis';
import {saveToken} from './saveToken';

export async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  
  if(!event || !event.queryStringParameters) {
    throw new Error("No query string parameters in redirect URI");
  }

  const rawState = event.queryStringParameters["state"] as string;
  interface State {
    user_id?: string
  }
  const state = JSON.parse(decodeURIComponent(rawState)) as State;
  const userId = state["user_id"];
  if(!userId) {
    throw new Error(`Cannot parse Slack user_id from redirect URL`);
  }

  const code = event.queryStringParameters["code"] as string;
  if(!code) {
    throw new Error(`No "code" query param in redirect URL`);
  }

  const clientId = process.env.CLIENT_ID;
  if(!clientId) {
    throw new Error("Missing env var CLIENT_ID");
  }
  const clientSecret = process.env.CLIENT_SECRET;
  if(!clientSecret) {
    throw new Error("Missing env var CLIENT_SECRET");
  }
  const redirectUri = process.env.REDIRECT_URI;
  if(!redirectUri) {
    throw new Error("Missing env var REDIRECT_URI");
  }
  const options: Auth.OAuth2ClientOptions = {
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
  };
  const oauth2Client = new Auth.OAuth2Client(options);
  const {tokens} = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;
  if(!refreshToken) {
    throw new Error("Failed to get refresh token from Google authentication service.");
  }
  await saveToken(refreshToken, userId);

  const html = generateLoggedInHTML();
  const result: APIGatewayProxyResult = {
    body: html,
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    }
  };

  return result;
}
