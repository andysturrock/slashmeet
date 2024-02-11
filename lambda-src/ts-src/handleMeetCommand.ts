import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {postToResponseUrl} from './postToResponseUrl';
import {Auth} from 'googleapis';
import {getAADToken, getGCalToken} from './tokenStorage';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {getSecretValue} from './awsAPI';
import {getSlackUserTimeZone, postMessage, scheduleMessage, SlashCommandPayload} from './slackAPI';
import {createGoogleMeetMeeting as createGoogleCalendarMeeting} from './createGoogleCalendarMeeting';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';
import {ConfidentialClientApplication, Configuration, LogLevel} from "@azure/msal-node";
import {generateAADAuthBlocks} from './generateAADAuthBlocks';
import {createOutlookCalendarMeeting} from './createOutlookCalendarMeeting';
import util from 'util';

export async function handleMeetCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;

  const gcpClientId = await getSecretValue('SlashMeet', 'gcpClientId');
  const gcpClientSecret = await getSecretValue('SlashMeet', 'gcpClientSecret');
  const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
  const gcpRedirectUri = `${slashMeetUrl}/google-oauth-redirect`;

  const aadClientId = await getSecretValue('SlashMeet', 'aadClientId');
  const aadTenantId = await getSecretValue('SlashMeet', 'aadTenantId');
  const aadClientSecret = await getSecretValue('SlashMeet', 'aadClientSecret');
  const aadRedirectUri = `${slashMeetUrl}/aad-oauth-redirect`;

  const msalConfig: Configuration = {
    auth: {
      clientId: aadClientId,
      authority: `https://login.microsoftonline.com/${aadTenantId}`,
      clientSecret: aadClientSecret
    }
  };

  const confidentialClientApplication = new ConfidentialClientApplication(msalConfig);
  
  const aadRefreshToken = await getAADToken(event.user_id);
  if(!aadRefreshToken) {
    const aadAuthBlocks = await generateAADAuthBlocks(confidentialClientApplication, aadRedirectUri, event.user_id, event.response_url);
    await postToResponseUrl(responseUrl, aadAuthBlocks);
  }

  const options: Auth.OAuth2ClientOptions = {
    clientId: gcpClientId,
    clientSecret: gcpClientSecret,
    redirectUri: gcpRedirectUri
  };
  const oauth2Client = new Auth.OAuth2Client(options);

  const gcalRefreshToken = await getGCalToken(event.user_id);
  if(!gcalRefreshToken) {
    const googleAuthBlocks = await generateGoogleAuthBlocks(oauth2Client, event.user_id, event.response_url);
    await postToResponseUrl(responseUrl, googleAuthBlocks);
  }

  // The user will come back here once logged into AAD and Google, so for now just return.
  if(!aadRefreshToken || !gcalRefreshToken) {
    return;
  }

  // User is logged into both AAD and Google so now we can use those APIs to create the meeting.
  oauth2Client.setCredentials({
    refresh_token: gcalRefreshToken
  });
  // Give a default name for the meeting if not provided.
  const meetingArgs = event.text.length == 0 ? '/meet' : event.text;
  const now = new Date();
  let meetingOptions: MeetingOptions;
  try {
    meetingOptions = parseMeetingArgs(meetingArgs, now);
  } catch (error) {
    console.error(error);
    await postErrorMessage(responseUrl, "Error parsing meeting options.");
    return;
  }

  let timeZone: string;
  // If the user specified a startDate then grab their timezone.
  // If they didn't specify (or they used "now"), then AWS uses GMT.
  // We'll pass the timezone to Google and MS Graph APIs later.
  if(meetingOptions.startDate.getTime() == now.getTime()) {
    timeZone = "Etc/GMT";
  }
  else {
    try {
      timeZone = await getSlackUserTimeZone(event.user_id);
    } catch (error) {
      console.error(error);
      await postErrorMessage(responseUrl, "Error getting user's timezone.");
      return;
    }
  }

  let meetingUrl: string;
  try {
    meetingUrl = await createGoogleCalendarMeeting(oauth2Client, meetingOptions, timeZone);  
  } catch (error) {
    console.error(error);
    await postErrorMessage(responseUrl, "Error creating Google Calendar Meeting.");
    return;
  }

  if(!meetingOptions.noCal) {
    try {
      await createOutlookCalendarMeeting(confidentialClientApplication, aadRefreshToken, event.user_id, event.channel_id, meetingOptions, timeZone, meetingUrl);
    } catch (error) {
      console.error(error);
      await postErrorMessage(responseUrl, "Error creating Outlook Calendar Meeting.");
      return;
    }
  }

  // Create a nice looking "join meeting" message and schedule it to be sent when the meeting starts.
  try {
    const joinMeetingBlocks = generateGoogleMeetURLBlocks(meetingUrl, meetingOptions.name);
    if(meetingOptions.now) {
      await postMessage(event.channel_id, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks);
    } else {
      await scheduleMessage(event.channel_id, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks, meetingOptions.startDate);
    }
  } catch (error) {
    console.error(error);
    await postErrorMessage(responseUrl, "Error scheduling join meeting message.");
    return;
  }

  // Tell the meeting organiser what their meeting URL will be.
  const blocks = {
    response_type: 'ephemeral',
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Your meeting URL is ${meetingUrl}`
        }
      }
    ]
  };
  await postToResponseUrl(responseUrl, blocks);
}

async function postErrorMessage(responseUrl: string, text: string) {
  const blocks = {
    response_type: 'ephemeral',
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text
        }
      }
    ]
  };
  await postToResponseUrl(responseUrl, blocks);
}