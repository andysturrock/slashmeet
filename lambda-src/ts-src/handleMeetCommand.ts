import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {postToResponseUrl} from './postToResponseUrl';
import {Auth} from 'googleapis';
import {getToken} from './tokenStorage';
import {generateGoogleMeetURLBlocks} from './generateGoogleMeetURLBlocks';
import {getSecretValue} from './awsAPI';
import {getSlackUserTimeZone} from './getSlackUserTimeZone';
import {createGoogleMeetMeeting as createGoogleCalendarMeeting} from './createGoogleCalendarMeeting';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';

interface SlackEvent {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

export async function handleMeetCommand(event: SlackEvent): Promise<void> {
  const responseUrl = event.response_url;

  const gcpClientId = await getSecretValue('SlashMeet', 'gcpClientId');
  const gcpClientSecret = await getSecretValue('SlashMeet', 'gcpClientSecret');
  const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
  const redirectUri = `${slashMeetUrl}/redirectUri`;

  const options: Auth.OAuth2ClientOptions = {
    clientId: gcpClientId,
    clientSecret: gcpClientSecret,
    redirectUri: redirectUri
  };
  const oauth2Client = new Auth.OAuth2Client(options);

  const refresh_token = await getToken(event.user_id);
  let blocks = {};
  if(!refresh_token) {
    const blocks = generateGoogleAuthBlocks(oauth2Client, event.user_id);
    await postToResponseUrl(responseUrl, blocks);
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
