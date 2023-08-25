import {Auth, calendar_v3, google} from 'googleapis';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';
import {WebClient, LogLevel} from "@slack/web-api";
import util from 'util';
import {getSecretValue} from './awsAPI';

export async function generateGoogleMeetURLBlocks(oauth2Client: Auth.OAuth2Client, meetingArgs: string, userId: string) {
  // Give a default name for the meeting if not provided.
  if(meetingArgs == '') {
    meetingArgs = 'slashmeet';
  }
  let meetingOptions: MeetingOptions;
  try {
    meetingOptions = parseMeetingArgs(meetingArgs, new Date());
  } catch (error) {
    const blocks = {
      response_type: 'in_channel',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Error parsing meeting parameters.`
          }
        }
      ]
    };
    return blocks;
  }

  // User will be specifying meetings times in their local timezone, whereas AWS always uses UTC.
  // So grab the timezone and we can specify it to Google API later.
  let timeZone = '';
  try {
    const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');

    const client = new WebClient(slackBotToken, {
      logLevel: LogLevel.INFO
    });
    const result = await client.users.info({
      user: userId
    });
    if(!result.user?.tz) {
      throw new Error("Cannot get timezone from user object");
    }
    timeZone = result.user.tz;
  }
  catch (error) {
    console.error(`Error: ${util.inspect(error)}`);
    const blocks = {
      response_type: 'in_channel',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Error discovering client timezone.`
          }
        }
      ]
    };
    return blocks;
  }

  const calendar = google.calendar('v3');
  google.options({auth: oauth2Client});

  // requestId must be different each time, so just use time in milliseconds.
  const requestId = Date.now.toString();
  const createRequest: calendar_v3.Schema$CreateConferenceRequest = {
    requestId: requestId
  };
  const conferenceData: calendar_v3.Schema$ConferenceData = {
    createRequest: createRequest
  };

  console.log(`timeZone = ${timeZone}`);
  console.log(`meetingOptions.startDate = ${util.inspect(meetingOptions.startDate)}`);
  console.log(`meetingOptions.endDate = ${util.inspect(meetingOptions.endDate)}`);
  console.log(`meetingOptions.startDate?.toISOString() = ${meetingOptions.startDate?.toISOString()}`);
  console.log(`meetingOptions.endDate?.toISOString() = ${meetingOptions.endDate?.toISOString()}`);

  // Convert time to RFC3339 format, without the milliseconds or Z bit as we will specify the timezone.
  const startDate = meetingOptions.startDate?.toISOString().substring(0, 19);
  const endDate = meetingOptions.endDate?.toISOString().substring(0, 19);
  console.log(`startDate = ${startDate}`);
  console.log(`endDate = ${endDate}`);

  const event: calendar_v3.Schema$Event = {
    conferenceData: conferenceData,
    summary: meetingOptions.name,
    description: 'Generated /meet event from Slack',
    start: {
      dateTime: startDate,
      timeZone: timeZone
    },
    end: {
      dateTime: endDate,
      timeZone: timeZone
    }
  };
  const meetingParams: calendar_v3.Params$Resource$Events$Insert = {
    calendarId: 'primary',
    conferenceDataVersion: 1,  // Magic number means "use the createRequest field"
    requestBody: event
  };

  const res = await calendar.events.insert(meetingParams);
  const meetingUrl = res.data.hangoutLink;
  if(!meetingUrl) {
    throw new Error("Failed to create GMeet meeting");
  }

  const blocks = {
    response_type: 'in_channel',
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Please join your meeting at ${meetingUrl}`
        }
      }
    ]
  };
  return blocks;
}
