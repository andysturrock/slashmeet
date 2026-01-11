import { google } from 'googleapis';
import { createGoogleMeetMeeting } from '../ts-src/createGoogleCalendarMeeting';
import { MeetingOptions } from '../ts-src/parseMeetingArgs';

jest.mock('googleapis', () => {
  const mCalendar = {
    events: {
      insert: jest.fn(),
    },
  };
  return {
    google: {
      calendar: jest.fn(() => mCalendar),
      options: jest.fn(),
    },
  };
});

describe('createGoogleCalendarMeeting', () => {
  const mCalendar = google.calendar('v3') as any;

  test('createGoogleMeetMeeting should return hangoutLink', async () => {
    const meetingUrl = 'http://meet.google.com/abc';
    mCalendar.events.insert.mockResolvedValue({ data: { hangoutLink: meetingUrl } });

    const oauth2Client = {} as any;
    const meetingOptions: MeetingOptions = {
      name: 'Test Meeting',
      startDate: new Date(),
      endDate: new Date(),
      now: true,
      noCal: false
    };

    const url = await createGoogleMeetMeeting(oauth2Client, meetingOptions);
    expect(url).toBe(meetingUrl);
    expect(mCalendar.events.insert).toHaveBeenCalled();
  });

  test('createGoogleMeetMeeting should throw if hangoutLink missing', async () => {
    mCalendar.events.insert.mockResolvedValue({ data: {} });
    const oauth2Client = {} as any;
    const meetingOptions = { name: 'Test', startDate: new Date(), endDate: new Date() } as any;

    await expect(createGoogleMeetMeeting(oauth2Client, meetingOptions)).rejects.toThrow("Failed to create GMeet meeting");
  });
});
