import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {generateLoggedInHTML} from './generateLoggedInHTML';
import {saveAADToken} from './tokenStorage';
import {getSecretValue} from './awsAPI';
import {deleteState, getState} from './stateTable';
import querystring from 'querystring';
import {AuthorizationCodePayload, AuthorizationCodeRequest, ConfidentialClientApplication, Configuration, LogLevel} from '@azure/msal-node';
import {aadScopes} from './aadConfig';

export async function handleAADAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    type Params = {
      code: string,
      client_info: string,
      state: string,
      session_state: string
    };
    const params = querystring.parse(event.body) as Params;

    const nonce = params.state;
    const state = await getState(nonce);
    if(!state) {
      throw new Error("Missing state.  Are you a cyber criminal trying a CSRF replay attack?");
    }
    await deleteState(nonce);

    const aadClientId = await getSecretValue('SlashMeet', 'aadClientId');
    const aadTenantId = await getSecretValue('SlashMeet', 'aadTenantId');
    const aadClientSecret = await getSecretValue('SlashMeet', 'aadClientSecret');
    const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
    const aadRedirectUri = `${slashMeetUrl}/aad-oauth-redirect`;
    const msalConfig: Configuration = {
      auth: {
        clientId: aadClientId,
        authority: `https://login.microsoftonline.com/${aadTenantId}`,
        clientSecret: aadClientSecret
      }
    };
    const confidentialClientApplication = new ConfidentialClientApplication(msalConfig);

    const authorizationCodeRequest: AuthorizationCodeRequest = {
      scopes: aadScopes,
      redirectUri: aadRedirectUri,
      code: params.code,
      codeVerifier: state.verifier,
      state: nonce
    };
    const authorizationCodePayload: AuthorizationCodePayload = {
      ...params
    };
    await confidentialClientApplication.acquireTokenByCode(authorizationCodeRequest, authorizationCodePayload);
    // MSAL doesn't give you the refresh_token directly in the AuthenticationResult returned in the call above.
    // See https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/2155
    // On the other hand it doesn't provide a very good mechanism to store the cache when there could
    // be multiple accounts.  So just get hold of the refresh token from its internals and we'll use that.
    const tokens = confidentialClientApplication.getTokenCache().getKVStore();
    type Token = {
      credentialType: "RefreshToken" | "AccessToken" | "IdToken",
      secret: string
    };
    let refreshToken: string | null = null;
    for(const tokenKey in tokens) {
      const tokenValue = tokens[tokenKey] as Token;
      if(tokenValue.credentialType === "RefreshToken") {
        refreshToken = tokenValue.secret;
        break;
      }
    }
    if(!refreshToken) {
      throw new Error("Failed to get refresh token from AAD Entra authentication service.");
    }
    await saveAADToken(refreshToken, state.slack_user_id);

    const html = generateLoggedInHTML("Microsoft");
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
