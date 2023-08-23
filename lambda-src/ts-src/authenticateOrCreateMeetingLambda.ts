import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {postToResponseUrl} from './postToResponseUrl';
import {Auth} from 'googleapis';
import {getToken} from './getToken';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';

interface SlackEvent {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

export async function lambdaHandler(event: SlackEvent): Promise<void> {
  const responseUrl = event.response_url;

  const clientId = process.env.CLIENT_ID;
  if(!clientId) {
    throw new Error("Missing env var CLIENT_ID");
  }
  const clientSecret = process.env.CLIENT_SECRET;
  if(!clientSecret) {
    throw new Error("Missing env var CLIENT_SECRET");
  }
  const customDomainName = process.env.CUSTOM_DOMAIN_NAME;
  if(!customDomainName) {
    throw new Error("Missing env var CUSTOM_DOMAIN_NAME");
  }
  const lambdaVersionIdForURL = process.env.LAMBDA_VERSION_FOR_URL;
  if(!lambdaVersionIdForURL) {
    throw new Error("Missing env var LAMBDA_VERSION_FOR_URL");
  }
  const redirectUri = `https://slashmeet.${customDomainName}/${lambdaVersionIdForURL}/redirectUri`;

  const options: Auth.OAuth2ClientOptions = {
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
  };
  const oauth2Client = new Auth.OAuth2Client(options);

  const refresh_token = await getToken(event.user_id);
  let blocks = {};
  if(!refresh_token) {
    blocks = generateGoogleAuthBlocks(oauth2Client, event.user_id);
  } else {
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });
    blocks = await generateGoogleMeetURLBlocks(oauth2Client, event.text, event.user_id);
  }
  await postToResponseUrl(responseUrl, blocks);
}
