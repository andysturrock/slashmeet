import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {postToResponseUrl} from './postToResponseUrl';
import {Auth} from 'googleapis';
import {getToken} from './getToken';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {getSecretValue} from './awsAPI';

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
