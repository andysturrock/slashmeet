import * as util from 'util';
import {WebClient, LogLevel} from "@slack/web-api";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import {InteractionPayload, getSlackUserTimeZone, postEphemeralMessage, postEphmeralErrorMessage, postErrorMessageToResponseUrl, postMessage, postToResponseUrl, scheduleMessage} from './slackAPI';
import axios from 'axios';
import {getSecretValue} from './awsAPI';
import {BlockAction, KnownBlock, ViewSubmitAction} from '@slack/bolt';
import {getAADToken, getGCalToken} from './tokenStorage';
import {ConfidentialClientApplication, Configuration} from '@azure/msal-node';
import {Auth} from 'googleapis';
import {createGoogleMeetMeeting} from "./createGoogleCalendarMeeting";
import {createOutlookCalendarMeeting} from './createOutlookCalendarMeeting';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {MeetingOptions} from './parseMeetingArgs';

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
      const viewSubmitAction: ViewSubmitAction = payload as ViewSubmitAction;
      await handleViewSubmission(viewSubmitAction);
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

    // Empty 200 tells Slack to close the dialog view if this was a view_submission event.
    const result: APIGatewayProxyResult = {
      body: "",
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

async function handleViewSubmission(viewSubmitAction: ViewSubmitAction) {
  console.log(`viewSubmitAction: ${util.inspect(viewSubmitAction, false, null)}`);
  type PrivateMetaData = {
    channelId: string,
    now: boolean};
  const privateMetaData = JSON.parse(viewSubmitAction.view.private_metadata) as PrivateMetaData;
  const userId = viewSubmitAction.user.id;

  if(viewSubmitAction.type == 'view_submission') {
    await postEphmeralErrorMessage(privateMetaData.channelId, userId, "This command is disabled currently.");
    return;
  }

  const state = viewSubmitAction.view.state;

  try {
    // Create a meetingOptions object from the values set in the dialog.
    const name = state.values["title"]["title"].value;
    if(!name) {
      throw new Error("Cannot find meeting name from dialog values");
    }
    const startDateSeconds = state.values["meeting_start"]["meeting_start"].value;
    if(!startDateSeconds) {
      throw new Error("Cannot find meeting start time from dialog values");
    }
    const endDateSeconds = state.values["meeting_end"]["meeting_end"].value;
    if(!endDateSeconds) {
      throw new Error("Cannot find meeting end time from dialog values");
    }
    const noCalString = state.values["nocal"]["nocal"].value;
    if(!noCalString) {
      throw new Error("Cannot find meeting end time from dialog values");
    }
    const noCal = (noCalString != "cal");
    const meetingOptions: MeetingOptions = {
      name,
      startDate: new Date(Number.parseInt(startDateSeconds) * 1000),
      endDate: new Date(Number.parseInt(endDateSeconds) * 1000),
      now: privateMetaData.now,
      noCal
    };
    console.log(`meetingOptions: ${util.inspect(meetingOptions, false, null)}`);

    const aadRefreshToken = await getAADToken(viewSubmitAction.user.id);
    const gcalRefreshToken = await getGCalToken(viewSubmitAction.user.id);
    // If we're not logged into Google then there's a logic error, but handle it gracefully anyway.
    // Logging into AAD is optional.
    if(!gcalRefreshToken && viewSubmitAction.response_urls) {
      await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Run the '/meet login' command to log in.");
      return;
    }
  
    const gcpClientId = await getSecretValue('SlashMeet', 'gcpClientId');
    const gcpClientSecret = await getSecretValue('SlashMeet', 'gcpClientSecret');
    const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
    const gcpRedirectUri = `${slashMeetUrl}/google-oauth-redirect`;

    const aadClientId = await getSecretValue('SlashMeet', 'aadClientId');
    const aadTenantId = await getSecretValue('SlashMeet', 'aadTenantId');
    const aadClientSecret = await getSecretValue('SlashMeet', 'aadClientSecret');

    const msalConfig: Configuration = {
      auth: {
        clientId: aadClientId,
        authority: `https://login.microsoftonline.com/${aadTenantId}`,
        clientSecret: aadClientSecret
      }
    };
    const confidentialClientApplication = new ConfidentialClientApplication(msalConfig);

    const oAuth2ClientOptions: Auth.OAuth2ClientOptions = {
      clientId: gcpClientId,
      clientSecret: gcpClientSecret,
      redirectUri: gcpRedirectUri
    };
    const oauth2Client = new Auth.OAuth2Client(oAuth2ClientOptions);

    oauth2Client.setCredentials({
      refresh_token: gcalRefreshToken
    });

    let meetingUrl: string;
    try {
      meetingUrl = await createGoogleMeetMeeting(oauth2Client, meetingOptions);  
    } catch (error) {
      console.error(error);
      await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Error creating Google Calendar Meeting.");
      return;
    }

    let timeZone = "Etc/UTC";
    try {
      timeZone = await getSlackUserTimeZone(userId);
    } catch (error) {
      console.error(error);
      await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Error getting user's timezone.");
      return;
    }

    if(!meetingOptions.noCal) {
      if(aadRefreshToken) {
        try {
          await createOutlookCalendarMeeting(confidentialClientApplication, aadRefreshToken, userId, privateMetaData.channelId, meetingOptions, timeZone, meetingUrl);
        } catch (error) {
          console.error(error);
          const errorMsg = "Can't create Outlook calendar entry.\n" +
            "I need to be a member of a private channel or DM to list the members.";
          await postEphmeralErrorMessage(privateMetaData.channelId, userId, errorMsg);
        }
      }
      else {
        await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Not logged into AAD so skipping creating Outlook Calendar Meeting.");
      }
    }

    // Create a nice looking "join meeting" message and schedule it to be sent when the meeting starts.
    try {
      const joinMeetingBlocks = generateGoogleMeetURLBlocks(meetingUrl, meetingOptions.name);
      if(meetingOptions.now) {
        await postMessage(privateMetaData.channelId, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks);
      } else {
        await scheduleMessage(privateMetaData.channelId, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks, meetingOptions.startDate);
      }
    } catch (error) {
      console.error(error);
      const errorMsg = "Can't send or schedule join meeting message.\n" +
        "I need to be a member of a private channel or DM to send messages to it.";
      await postEphmeralErrorMessage(privateMetaData.channelId, userId, errorMsg);
    }

    // Tell the meeting organiser what their meeting URL will be.
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Your meeting URL is ${meetingUrl}`
        }
      }
    ];
    await postEphemeralMessage(privateMetaData.channelId, userId, `Your meeting URL is ${meetingUrl}`, blocks);
  }
  catch (error) {
    console.error(error);
    await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Failed to create GMeet meeting");
  }
}
