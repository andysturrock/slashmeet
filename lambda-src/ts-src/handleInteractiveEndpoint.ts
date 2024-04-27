import * as util from 'util';
import {WebClient, LogLevel} from "@slack/web-api";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import {InteractionPayload} from './slackAPI';
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

    const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');
    const client = new WebClient(slackBotToken, {
      logLevel: LogLevel.INFO
    });

    // TODO assume we only get one Action for now
    if(payload.actions[0].action_id === "googleSignInButton" || payload.actions[0].action_id === "microsoftSignInButton") {
      // Delete the original login card as it can't be used again without appearing like a CSRF replay attack.
      // Use the POST api as per https://api.slack.com/interactivity/handling#deleting_message_response
      // chat.delete doesn't seem to work here.
      await axios.post(payload.response_url, {delete_original: "true"});
    }
    else if(payload.actions[0].action_id == "joinMeetingButton") {
      // Reply in a thread with who has joined the meeting.
      await client.chat.postMessage({
        channel: payload.channel.id,
        thread_ts: payload.message.ts,
        text: `<@${payload.user.id}> has joined the meeting`
      });
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
