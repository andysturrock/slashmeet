import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { ViewSubmitAction } from '@slack/bolt/dist/types/view';
import { KnownBlock } from '@slack/web-api';
import { Auth } from 'googleapis';
import { getSecretValue } from './awsAPI';
import { createGoogleMeetMeeting } from "./createGoogleCalendarMeeting";
import { AuthenticationError, createOutlookCalendarMeeting } from './createOutlookCalendarMeeting';
import { generateGoogleMeetURLBlocks } from './generateGoogleMeetURLBlocks';
import { MeetingOptions } from './parseMeetingArgs';
import { getSlackUserTimeZone, getUserEmailAddress, postEphemeralMessage, postEphmeralErrorMessage, postMessage, scheduleMessage } from './slackAPI';
import { deleteAADToken, getAADToken, getGCalToken } from './tokenStorage';

type HandleCreateMeetingsInput = {
  meetingOptions: MeetingOptions,
  attendees: string[] | undefined,
  viewSubmitAction: ViewSubmitAction
};
export async function handleCreateMeetings(payload: HandleCreateMeetingsInput): Promise<void> {
  type PrivateMetaData = {
    channelId: string,
    now: boolean};
  const privateMetaData = JSON.parse(payload.viewSubmitAction.view.private_metadata) as PrivateMetaData;
  const userId = payload.viewSubmitAction.user.id;

  // Need to make the dates real Date objects again not just the JSON representation
  payload.meetingOptions.startDate = new Date(payload.meetingOptions.startDate);
  payload.meetingOptions.endDate = new Date(payload.meetingOptions.endDate);

  try {
    const aadRefreshToken = await getAADToken(payload.viewSubmitAction.user.id);
    const gcalRefreshToken = await getGCalToken(payload.viewSubmitAction.user.id);
    // If we're not logged into Google then there's a logic error, but handle it gracefully anyway.
    // Logging into AAD is optional.
    if(!gcalRefreshToken) {
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
      meetingUrl = await createGoogleMeetMeeting(oauth2Client, payload.meetingOptions);
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

    if(!payload.meetingOptions.noCal) {
      if(aadRefreshToken) {
        try {
          const emailAddresses: string[] = [];
          if(payload.attendees) {
            for(const attendee of payload.attendees) {
              const emailAddress = await getUserEmailAddress(attendee);
              if(emailAddress) {
                emailAddresses.push(emailAddress);
              }
            }
          }
          await createOutlookCalendarMeeting(confidentialClientApplication, aadRefreshToken, emailAddresses, payload.meetingOptions, timeZone, meetingUrl);
        } catch (error) {
          if(error instanceof AuthenticationError) {
            // Delete the token here which lets the user log in again which will hopefully fix the problem.
            await deleteAADToken(userId);
            console.error(error);
            const errorMsg = "Authentication problem.  Please log in again.";
            await postEphmeralErrorMessage(privateMetaData.channelId, userId, errorMsg);
          } else {
            console.error(error);
            const errorMsg = "Can't create Outlook calendar entry.\n" +
            "I need to be a member of a private channel or DM to list the members.";
            await postEphmeralErrorMessage(privateMetaData.channelId, userId, errorMsg);
          }
        }
      }
      else {
        await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Not logged into AAD so skipping creating Outlook Calendar Meeting.");
      }
    }

    // Create a nice looking "join meeting" message and schedule it to be sent when the meeting starts.
    try {
      const joinMeetingBlocks = generateGoogleMeetURLBlocks(meetingUrl, payload.meetingOptions.name);
      if(payload.meetingOptions.now) {
        await postMessage(privateMetaData.channelId, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks);
      } else {
        await scheduleMessage(privateMetaData.channelId, `Please join your meeting at ${meetingUrl}`, joinMeetingBlocks, payload.meetingOptions.startDate);
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
    try {
      await postEphmeralErrorMessage(privateMetaData.channelId, userId, "Error creating meeting");
    }
    catch (error) {
      console.error(error);
    }
  }
}
