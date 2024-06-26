import {Auth, calendar_v3, google} from 'googleapis';
import {MeetingOptions} from './parseMeetingArgs';

/**
 * 
 * @param oauth2Client 
 * @param meetingArgs 
 * @param userId 
 * @returns URL of the meeting
 * @throws if meeting creation fails or cannot get the timezone from the Slack user.
 */
export async function createGoogleMeetMeeting(oauth2Client: Auth.OAuth2Client, meetingOptions: MeetingOptions) {
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

  const event: calendar_v3.Schema$Event = {
    conferenceData: conferenceData,
    summary: meetingOptions.name,
    description: 'Generated /meet event from Slack',
    start: {
      dateTime: meetingOptions.startDate.toISOString()
    },
    end: {
      dateTime: meetingOptions.endDate.toISOString()
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

  return meetingUrl;
}
