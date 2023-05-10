import functions = require('@google-cloud/functions-framework');
import { getToken } from './getToken';
import { verifySlackRequest } from './verifySlackRequest';
import { Auth } from 'googleapis';
import { generateGoogleMeetURLBlocks } from '../generateGoogleMeetURLBlocks';
import { generateGoogleAuthBlocks } from '../generateGoogleAuthBlocks';

export async function slackRequest(req: functions.Request, oauth2Client: Auth.OAuth2Client) {
  // Verify that this request really did come from Slack
  verifySlackRequest(req);
  
  interface Body {
    user_id?: string
    channel_id?: string
    trigger_id?: string,
  }
  const body = req.body as Body;
  if(!body.user_id) {
    throw new Error("Missing user_id field in message body");
  }

  // See if we have a token for this Slack user
  const refresh_token = await getToken(body.user_id);
  if(!refresh_token) {
    // If not, generate a message asking them to authenticate.
    const blocks = generateGoogleAuthBlocks(oauth2Client, body.user_id);
    return blocks;
  }

  oauth2Client.setCredentials({
    refresh_token: refresh_token
  });
  
  // If so, create the meeting and generate a message with the GMeet URL
  const blocks = await generateGoogleMeetURLBlocks(oauth2Client);
  return blocks;
}
