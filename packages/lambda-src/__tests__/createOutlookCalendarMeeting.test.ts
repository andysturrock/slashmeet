import { Client } from '@microsoft/microsoft-graph-client';
import { createOutlookCalendarMeeting } from '../ts-src/createOutlookCalendarMeeting';
import { MeetingOptions } from '../ts-src/parseMeetingArgs';

jest.mock('@microsoft/microsoft-graph-client', () => {
  const mClient = {
    api: jest.fn().mockReturnThis(),
    post: jest.fn(),
  };
  return {
    Client: {
      init: jest.fn(() => mClient),
    },
  };
});

describe('createOutlookCalendarMeeting', () => {
  const mClient = Client.init({} as any) as any;

  test('createOutlookCalendarMeeting should call MS Graph API', async () => {
    const confidentialClientApplication = {
      acquireTokenByRefreshToken: jest.fn().mockResolvedValue({ accessToken: 'token' }),
    } as any;

    const meetingOptions: MeetingOptions = {
      name: 'Test Meeting',
      startDate: new Date(),
      endDate: new Date(),
      now: true,
      noCal: false
    };

    await createOutlookCalendarMeeting(
      confidentialClientApplication,
      'refresh-token',
      ['user@example.com'],
      meetingOptions,
      'Europe/London',
      'http://meet.url'
    );

    expect(confidentialClientApplication.acquireTokenByRefreshToken).toHaveBeenCalled();
    expect(mClient.api).toHaveBeenCalledWith('/me/events');
    expect(mClient.post).toHaveBeenCalled();
  });

  test('createOutlookCalendarMeeting should throw if auth fails', async () => {
    const confidentialClientApplication = {
      acquireTokenByRefreshToken: jest.fn().mockResolvedValue(null),
    } as any;

    await expect(createOutlookCalendarMeeting(
      confidentialClientApplication,
      'token',
      [],
      {} as any,
      'UTC',
      ''
    )).rejects.toThrow("Failed to get new access token from refresh token");
  });
});
