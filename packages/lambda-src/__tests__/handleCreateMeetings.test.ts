import { getSecretValue } from '../ts-src/awsAPI';
import { createGoogleMeetMeeting } from "../ts-src/createGoogleCalendarMeeting";
import { AuthenticationError, createOutlookCalendarMeeting } from '../ts-src/createOutlookCalendarMeeting';
import { handleCreateMeetings } from '../ts-src/handleCreateMeetings';
import * as slackAPI from '../ts-src/slackAPI';
import { deleteAADToken, getAADToken, getGCalToken } from '../ts-src/tokenStorage';

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/tokenStorage');
jest.mock('../ts-src/createGoogleCalendarMeeting');
jest.mock('../ts-src/createOutlookCalendarMeeting');
jest.mock('../ts-src/slackAPI');

describe('handleCreateMeetings', () => {
  const payload = {
    meetingOptions: {
      name: 'Test Meeting',
      startDate: new Date(),
      endDate: new Date(),
      now: true,
      noCal: false
    },
    attendees: ['U1'],
    viewSubmitAction: {
      view: {
        private_metadata: JSON.stringify({ channelId: 'C123', now: true })
      },
      user: { id: 'U organiser' }
    }
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getSecretValue as jest.Mock).mockResolvedValue('secret');
  });

  test('should create meetings and notify users', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (getAADToken as jest.Mock).mockResolvedValue('a-token');
    (createGoogleMeetMeeting as jest.Mock).mockResolvedValue('http://g-meet');
    (slackAPI.getSlackUserTimeZone as jest.Mock).mockResolvedValue('UTC');
    (slackAPI.getUserEmailAddress as jest.Mock).mockResolvedValue('user@example.com');

    await handleCreateMeetings(payload);

    expect(createGoogleMeetMeeting).toHaveBeenCalled();
    expect(createOutlookCalendarMeeting).toHaveBeenCalled();
    expect(slackAPI.postMessage).toHaveBeenCalled();
    expect(slackAPI.postEphemeralMessage).toHaveBeenCalled();
  });

  test('should skip Outlook if not logged into AAD', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (getAADToken as jest.Mock).mockResolvedValue(undefined);
    (createGoogleMeetMeeting as jest.Mock).mockResolvedValue('http://g-meet');

    await handleCreateMeetings(payload);

    expect(createOutlookCalendarMeeting).not.toHaveBeenCalled();
    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Not logged into AAD')
    );
  });

  test('should handle error in Google meeting creation', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (createGoogleMeetMeeting as jest.Mock).mockRejectedValue(new Error('Google error'));

    await handleCreateMeetings(payload);

    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Error creating Google Calendar Meeting')
    );
  });

  test('should handle early exit if no Google token', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue(undefined);
    await handleCreateMeetings(payload);
    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('log in')
    );
  });

  test('should handle AuthenticationError in Outlook creation', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (getAADToken as jest.Mock).mockResolvedValue('a-token');
    (createGoogleMeetMeeting as jest.Mock).mockResolvedValue('http://meet');
    const authError = new AuthenticationError('Auth fail');
    (createOutlookCalendarMeeting as jest.Mock).mockRejectedValue(authError);

    await handleCreateMeetings(payload);

    expect(deleteAADToken as jest.Mock).toHaveBeenCalled();
    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Authentication problem')
    );
  });

  test('should handle scheduleMessage error', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    const futurePayload = {
      ...payload,
      meetingOptions: { ...payload.meetingOptions, now: false }
    };
    futurePayload.viewSubmitAction.view.private_metadata = JSON.stringify({ channelId: 'C123', now: false, startDate: new Date() });
    (slackAPI.scheduleMessage as jest.Mock).mockRejectedValue(new Error('Schedule fail'));

    await handleCreateMeetings(futurePayload);

    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Can\'t send or schedule')
    );
  });

  test('should handle generic error in Outlook creation', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (getAADToken as jest.Mock).mockResolvedValue('a-token');
    (createGoogleMeetMeeting as jest.Mock).mockResolvedValue('http://meet');
    (createOutlookCalendarMeeting as jest.Mock).mockRejectedValue(new Error('Generic error'));

    await handleCreateMeetings(payload);

    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Can\'t create Outlook calendar entry')
    );
  });

  test('should handle postMessage failure', async () => {
    (getGCalToken as jest.Mock).mockResolvedValue('g-token');
    (getAADToken as jest.Mock).mockResolvedValue(undefined); // skip outlook for simplicity
    (createGoogleMeetMeeting as jest.Mock).mockResolvedValue('http://meet');
    (slackAPI.postMessage as jest.Mock).mockRejectedValue(new Error('Post fail'));

    await handleCreateMeetings(payload);

    expect(slackAPI.postEphmeralErrorMessage).toHaveBeenCalledWith(
      'C123', 'U organiser', expect.stringContaining('Can\'t send or schedule')
    );
  });
});
