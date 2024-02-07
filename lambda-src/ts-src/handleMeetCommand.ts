import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {postToResponseUrl} from './postToResponseUrl';
import {Auth} from 'googleapis';
import {getToken} from './tokenStorage';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {getSecretValue} from './awsAPI';
import {getSlackUserTimeZone} from './getSlackUserTimeZone';
import {createGoogleMeetMeeting as createGoogleCalendarMeeting} from './createGoogleCalendarMeeting';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';
import {SlashCommandPayload} from './slackTypes';
import {ConfidentialClientApplication, Configuration, LogLevel} from "@azure/msal-node";
import {generateAADAuthBlocks} from './generateAADAuthBlocks';
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
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Verbose,
        loggerCallback: (level, message, containsPii) => {
          if(containsPii) {
            return;
          }
          switch(level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          }
        },
        piiLoggingEnabled: false
      },
    }
  };
  const confidentialClientApplication = new ConfidentialClientApplication(msalConfig);

  const aadAuthBlocks = await generateAADAuthBlocks(confidentialClientApplication, aadRedirectUri, event.user_id, event.response_url);
  console.log(`aadAuthBlocks: ${util.inspect(aadAuthBlocks, true, undefined)}`);

  const options: Auth.OAuth2ClientOptions = {
    clientId: gcpClientId,
    clientSecret: gcpClientSecret,
    redirectUri: gcpRedirectUri
  };
  const oauth2Client = new Auth.OAuth2Client(options);

  const refresh_token = await getToken(event.user_id);
  let blocks = {};
  if(!refresh_token) {
    const googleAuthBlocks = await generateGoogleAuthBlocks(oauth2Client, event.user_id, event.response_url);
    await postToResponseUrl(responseUrl, googleAuthBlocks);
    return;
  } else {
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });
    // Give a default name for the meeting if not provided.
    const meetingArgs = event.text.length == 0 ? '/meet' : event.text;
    const now = new Date();
    let meetingOptions: MeetingOptions;
    try {
      meetingOptions = parseMeetingArgs(meetingArgs, now);
    } catch (error) {
      console.error(error);
      const blocks = {
        response_type: 'in_channel',
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Error parsing meeting options.`
            }
          }
        ]
      };
      await postToResponseUrl(responseUrl, blocks);
      return;
    }

    let timeZone: string;
    // If the user specified a startDate then grab their timezone.
    // If they didn't specify (or they used "now"), then AWS uses GMT.
    // We'll pass the timezone to Google API later.
    if(meetingOptions.startDate.getTime() == now.getTime()) {
      timeZone = "Etc/GMT";
    }
    else {
      try {
        timeZone = await getSlackUserTimeZone(event.user_id);
      } catch (error) {
        console.error(error);
        const blocks = {
          response_type: 'in_channel',
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Error getting user's timezone.`
              }
            }
          ]
        };
        await postToResponseUrl(responseUrl, blocks);
        return;
      }
    }

    let meetingUrl: string;
    try {
      meetingUrl = await createGoogleCalendarMeeting(oauth2Client, meetingOptions, timeZone);  
    } catch (error) {
      console.error(error);
      const blocks = {
        response_type: 'in_channel',
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Error creating Google Calendar Meeting.`
            }
          }
        ]
      };
      await postToResponseUrl(responseUrl, blocks);
      return;
    }
    
    blocks = generateGoogleMeetURLBlocks(meetingUrl);
    await postToResponseUrl(responseUrl, blocks);
  }
}
