import * as util from 'util';
import {WebClient, LogLevel} from "@slack/web-api";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import axios from 'axios';
import {getSecretValue} from './awsAPI';
import {BlockAction, ViewSubmitAction} from '@slack/bolt';
import {MeetingOptions} from './parseMeetingArgs';
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from '@aws-sdk/client-lambda';

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
    type ActionType = {
      type: string
    };
    const payload = JSON.parse(body) as ActionType;

    switch(payload.type) {
    case "view_submission": {
      // We only get three seconds to respond to a view submission.
      // So just grab the values from the Modal and then async invoke
      // another lambda to call the Google and MS APIs.
      const viewSubmitAction: ViewSubmitAction = payload as ViewSubmitAction;
      const {meetingOptions, participants} = handleViewSubmission(viewSubmitAction);
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };
      const handleCreateMeetingsInput = {
        meetingOptions,
        participants,
        viewSubmitAction
      };
  
      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: "SlashMeet-handleCreateMeetingsLambda",
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(handleCreateMeetingsInput))
      };
  
      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke SlashMeet-handleCreateMeetingsLambda - error:${util.inspect(output.FunctionError)}`);
      }
      break;
    }
    case "block_actions": {
      const blockAction: BlockAction = payload as BlockAction;
      await handleBlockAction(blockAction);
      break;
    }
    default:
      break;
    }

    const result: APIGatewayProxyResult = {
      statusCode: 200,
      body: ""
    };

    return result;
  }
  catch (error) {
    console.error(error);

    const json = {
      error: "Error handling interaction.  Check logs for details."
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}

async function handleBlockAction(blockAction: BlockAction) {
  const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');
  const client = new WebClient(slackBotToken, {
    logLevel: LogLevel.INFO
  });
  
  // TODO assume we only get one Action for now
  if(blockAction.actions[0].action_id === "googleSignInButton" || blockAction.actions[0].action_id === "microsoftSignInButton") {
    // Delete the original login card as it can't be used again without appearing like a CSRF replay attack.
    // Use the POST api as per https://api.slack.com/interactivity/handling#deleting_message_response
    // chat.delete doesn't seem to work here.
    await axios.post(blockAction.response_url, {delete_original: "true"});
  }
  else if(blockAction.actions[0].action_id == "joinMeetingButton") {
    // These can be undefined according to the type system but won't be
    if(blockAction.channel && blockAction.message) {
      // Reply in a thread with who has joined the meeting.
      await client.chat.postMessage({
        channel: blockAction.channel.id,
        thread_ts: blockAction.message.ts,
        text: `<@${blockAction.user.id}> has joined the meeting`
      });
    }
  }
  else 
  {
    // TODO handle other BlockAction commands if necessary
  }
}

function handleViewSubmission(viewSubmitAction: ViewSubmitAction) {
  type PrivateMetaData = {
    channelId: string,
    now: boolean};
  const privateMetaData = JSON.parse(viewSubmitAction.view.private_metadata) as PrivateMetaData;
  const state = viewSubmitAction.view.state;

  // Create a meetingOptions object from the values set in the dialog.
  const name = state.values["title"]["title"].value;
  if(!name) {
    throw new Error("Cannot find meeting name from dialog values");
  }
  const startDateSeconds = state.values["meeting_start"]["meeting_start"].selected_date_time;
  if(!startDateSeconds) {
    throw new Error("Cannot find meeting start time from dialog values");
  }
  const endDateSeconds = state.values["meeting_end"]["meeting_end"].selected_date_time;
  if(!endDateSeconds) {
    throw new Error("Cannot find meeting end time from dialog values");
  }
  const noCalString = state.values["nocal"]["nocal"].selected_option?.value;
  if(!noCalString) {
    throw new Error("Cannot find 'nocal' value from dialog values");
  }
  const participants = state.values["participants"]["participants"].selected_users;
  if(!noCalString) {
    throw new Error("Cannot find 'nocal' value from dialog values");
  }
  const meetingOptions: MeetingOptions = {
    name,
    startDate: new Date(startDateSeconds * 1000),
    endDate: new Date(endDateSeconds * 1000),
    now: privateMetaData.now,
    noCal: (noCalString == "nocal")
  };
  return {meetingOptions, participants};
}
