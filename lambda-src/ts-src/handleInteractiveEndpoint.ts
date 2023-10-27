import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import {InteractionPayload} from './slackTypes';
import axios from 'axios';
import {getSecretValue} from './awsAPI';

/**
 * Handle the interaction posts from Slack.
 * @param event the event from Slack containing the interaction payload
 * @returns HTTP 200 back to Slack immediately to indicate the interaction payload has been received.
 */
export async function handleInteractiveEndpoint(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }

    const signingSecret = await getSecretValue('SlashMeet', 'slackSigningSecret');
    
    // Verify that this request really did come from Slack
    verifySlackRequest(signingSecret, event.headers, event.body);

    let body = decodeURIComponent(event.body);
    // For some reason the body parses to "payload= {...}"
    // so remove the bit outside the JSON
    body = body.replace('payload=', '');
    const payload = JSON.parse(body) as InteractionPayload;

    // TODO assume we only get one Action for now
    if(payload.actions[0].action_id == "googleSignInButton") {
      // Delete the original login card as it can't be used again without appearing like a CSRF replay attack.
      await axios.post(payload.response_url, {delete_original: "true"});
    }
    else 
    {
      // TODO handle other interactive commands if necessary
    }

    const result: APIGatewayProxyResult = {
      body: JSON.stringify({msg: "ok"}),
      statusCode: 200
    };

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);

    const json = {
      error: JSON.stringify(util.inspect(error))
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}
