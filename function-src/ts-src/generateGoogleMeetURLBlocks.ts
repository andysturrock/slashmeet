import {Auth, calendar_v3, google} from 'googleapis';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';

export async function generateGoogleMeetURLBlocks(oauth2Client: Auth.OAuth2Client, meetingArgs: string) {

  const hourInMillis = 1000 * 60 * 60;
  let meetingOptions: MeetingOptions = {
    name: "/meet",
    duration: "60m",
    startTime: new Date(Date.now()).toISOString(),
    finishTime: new Date(Date.now() + hourInMillis).toISOString()
  };
  try {
    meetingOptions = parseMeetingArgs(meetingArgs);
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
  const calendar = google.calendar('v3');
  google.options({auth: oauth2Client});

  // requestId must be different each time, so just use time in milliseconds.s
  const requestId = Date.now.toString();
  const createRequest: calendar_v3.Schema$CreateConferenceRequest = {
    requestId: requestId
  };
  const conferenceData: calendar_v3.Schema$ConferenceData = {
    createRequest: createRequest
  };

  const event: calendar_v3.Schema$Event = {
    conferenceData: conferenceData,
    summary: meetingOptions.name,
    description: 'Generated /meet event from Slack',
    start: {
      dateTime: meetingOptions.startTime
    },
    end: {
      dateTime: meetingOptions.finishTime
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
