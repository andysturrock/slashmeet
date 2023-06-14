import * as functions from '@google-cloud/functions-framework';
import {slackRequest} from './slackRequest';
import {saveToken} from './saveToken';
import {Auth} from 'googleapis';
import {generateLoggedInHTML} from '../generateLoggedInHTML';
import {generateImmediateSlackResponseBlocks} from '../generateImmediateSlackResponseBlocks';
import {postToResponseUrl} from '../postToResponseUrl';

async function slashmeet(req: functions.Request, res: functions.Response) {
  try {
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

    // This is us being called back from the Google authentication page.
    if(req.method === 'GET' && req.path === '/redirectUri') {
      const rawState = req.query['state'] as string; 
      if(!rawState) {
        throw new Error(`No "state" query param in redirect URL}`);
      }
      
      interface State {
        user_id?: string
      }
      const state = JSON.parse(decodeURIComponent(rawState)) as State;
      const userId = state["user_id"];
      if(!userId) {
        throw new Error(`Cannot parse Slack user_id from redirect URL`);
      }

      const code = req.query['code'] as string;
      if(!code) {
        throw new Error(`No "code" query param in redirect URL`);
      }
      const {tokens} = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;
      if(!refreshToken) {
        throw new Error("Failed to get refresh token from Google authentication service.");
      }
      await saveToken(refreshToken, userId);
      const html = generateLoggedInHTML();
      return res.status(200).send(html);
    }
    // This is us being called from Slack
    if(req.method === 'POST' && req.path === '/slack') {
      // We need to respond within 3 seconds so do that first and then
      // do the rest of the processing asynchronously.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const response_url  = req.body.response_url as string;

      const immediateResponse = generateImmediateSlackResponseBlocks();
      res.status(200).send(immediateResponse);
      // TODO delete ephemeral response?

      // Send the async response by using the response_url field.
      // See https://api.slack.com/interactivity/handling#acknowledgment_response
      const finalResponse = await slackRequest(req, oauth2Client);
      await postToResponseUrl(response_url, finalResponse);
      return res;
    }

    throw new Error(`Unexpected method ${req.method} on path ${req.path}`);

  } catch (err) {
    console.error(err);
    const slackMessage = {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      text: `Error: ${err}`
    };
    // TODO send to response_url if have already sent initial response.
    return res.status(200).send(slackMessage);
  }
}

functions.http('slashmeet', slashmeet);


