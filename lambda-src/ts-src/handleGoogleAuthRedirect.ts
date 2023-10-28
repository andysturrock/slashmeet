import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {generateLoggedInHTML} from './generateLoggedInHTML';
import {Auth} from 'googleapis';
import {saveToken} from './tokenStorage';
import {getSecretValue} from './awsAPI';
import {deleteState, getState} from './stateTable';

export async function handleGoogleAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    type QueryStringParameters = {
      code: string,
      state: string // This will contain the Slack user ID
    };
    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const nonce = queryStringParameters.state;
    const state = await getState(nonce);
    if(!state) {
      throw new Error("Missing state.  Are you a cyber criminal trying a CSRF replay attack?");
    }
    await deleteState(nonce);

    const gcpClientId = await getSecretValue('SlashMeet', 'gcpClientId');
    const gcpClientSecret = await getSecretValue('SlashMeet', 'gcpClientSecret');
    const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
    const redirectUri = `${slashMeetUrl}/redirectUri`;

    const options: Auth.OAuth2ClientOptions = {
      clientId: gcpClientId,
      clientSecret: gcpClientSecret,
      redirectUri: redirectUri
    };
    const oauth2Client = new Auth.OAuth2Client(options);
    const {tokens} = await oauth2Client.getToken(queryStringParameters.code);
    const refreshToken = tokens.refresh_token;
    if(!refreshToken) {
      throw new Error("Failed to get refresh token from Google authentication service.");
    }
    await saveToken(refreshToken, state.slack_user_id);

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
  catch (error) {
    console.error(error);

    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Failure</h1>
<p>There was an error.  Please check the logs.</p>

</body>
</html>
  `;

    const result: APIGatewayProxyResult = {
      body: html,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    };
    return result;
  }
}
