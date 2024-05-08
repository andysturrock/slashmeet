import {Auth} from 'googleapis';
import {getAADToken, getGCalToken} from './tokenStorage';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {getSecretValue} from './awsAPI';
import {getSlackUserTimeZone, postErrorMessageToResponseUrl, postMessage, postToResponseUrl, scheduleMessage, SlashCommandPayload} from './slackAPI';
import {createGoogleMeetMeeting as createGoogleCalendarMeeting} from './createGoogleCalendarMeeting';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';
import {ConfidentialClientApplication, Configuration} from "@azure/msal-node";
import {createOutlookCalendarMeeting} from './createOutlookCalendarMeeting';
import {KnownBlock} from '@slack/bolt';

export async function handleMeetCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;
  try {

    let timeZone = "Etc/UTC";
    try {
      timeZone = await getSlackUserTimeZone(event.user_id);
    } catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "Error getting user's timezone.");
      return;
    }

    // Give a default name for the meeting if not provided.
    const meetingArgs = event.text.length == 0 ? '/meet' : event.text;
    const now = new Date();
    let meetingOptions: MeetingOptions;
    try {
      meetingOptions = parseMeetingArgs(meetingArgs, now, timeZone);
    } catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "Error parsing meeting options.");
      return;
    }
    
    const aadRefreshToken = await getAADToken(event.user_id);
    const gcalRefreshToken = await getGCalToken(event.user_id);
    // If we're not logged into Google then there's a logic error, but handle it gracefully anyway.
    // Logging into AAD is optional.
    if(!gcalRefreshToken) {
      await postErrorMessageToResponseUrl(responseUrl, "Run the /meet login command to log in.");
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
      meetingUrl = await createGoogleCalendarMeeting(oauth2Client, meetingOptions);  
    } catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "Error creating Google Calendar Meeting.");
      return;
    }

    if(!meetingOptions.noCal) {
      if(aadRefreshToken) {
        try {
          await createOutlookCalendarMeeting(confidentialClientApplication, aadRefreshToken, event.user_id, event.channel_id, meetingOptions, timeZone, meetingUrl);
        } catch (error) {
          console.error(error);
          const errorMsg = "Can't create Outlook calendar entry.\n" +
            "I need to be a member of a private channel or DM to list the members.";
          await postErrorMessageToResponseUrl(responseUrl, errorMsg);
        }
      }
      else {
        await postErrorMessageToResponseUrl(responseUrl, "Not logged into AAD so skipping creating Outlook Calendar Meeting.");
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
      const errorMsg = "Can't send or schedule join meeting message.\n" +
        "I need to be a member of a private channel or DM to send messages to it.";
      await postErrorMessageToResponseUrl(responseUrl, errorMsg);
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
    await postToResponseUrl(responseUrl, "ephemeral", `Your meeting URL is ${meetingUrl}`, blocks);
  }
  catch (error) {
    console.error(error);
    await postErrorMessageToResponseUrl(responseUrl, "Failed to create GMeet meeting");
  }
}