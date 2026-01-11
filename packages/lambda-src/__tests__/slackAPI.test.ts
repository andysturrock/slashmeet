import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { getSecretValue } from '../ts-src/awsAPI';
import {
  getChannelMembers,
  getSlackUserTimeZone,
  getUserEmailAddress,
  openView,
  postEphemeralMessage,
  postEphmeralErrorMessage,
  postErrorMessageToResponseUrl,
  postMessage,
  postToResponseUrl,
  scheduleMessage,
  updateView
} from '../ts-src/slackAPI';

jest.mock('@slack/web-api', () => {
  const mWebClient = {
    views: {
      open: jest.fn(),
      update: jest.fn(),
    },
    users: {
      info: jest.fn(),
    },
    conversations: {
      members: jest.fn(),
    },
    chat: {
      scheduleMessage: jest.fn(),
      postMessage: jest.fn(),
      postEphemeral: jest.fn(),
    },
  };
  return {
    WebClient: jest.fn(() => mWebClient),
    LogLevel: { INFO: 'info' }
  };
});

jest.mock('axios');
jest.mock('../ts-src/awsAPI');

const mockedWebClient = new WebClient('token') as jest.Mocked<any>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;

describe('slackAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('fake-token');
  });

  test('openView should call client.views.open', async () => {
    const trigger_id = '123.456';
    const view = { type: 'modal' as const, title: { type: 'plain_text' as const, text: 'title' }, blocks: [] };
    await openView(trigger_id, view);
    expect(mockedWebClient.views.open).toHaveBeenCalledWith({ trigger_id, view });
  });

  test('updateView should call client.views.update', async () => {
    const view_id = 'V123';
    const hash = 'abc';
    const view = { type: 'modal' as const, title: { type: 'plain_text' as const, text: 'title' }, blocks: [] };
    await updateView(view_id, hash, view);
    expect(mockedWebClient.views.update).toHaveBeenCalledWith({ view_id, hash, view });
  });

  test('getSlackUserTimeZone should return tz', async () => {
    mockedWebClient.users.info.mockResolvedValue({ user: { tz: 'Europe/London' } });
    const tz = await getSlackUserTimeZone('U123');
    expect(tz).toBe('Europe/London');
  });

  test('getSlackUserTimeZone should throw if no tz', async () => {
    mockedWebClient.users.info.mockResolvedValue({ user: {} });
    await expect(getSlackUserTimeZone('U123')).rejects.toThrow("Cannot get timezone from user object");
  });

  test('getUserEmailAddress should return email', async () => {
    mockedWebClient.users.info.mockResolvedValue({ user: { profile: { email: 'test@example.com' } } });
    const email = await getUserEmailAddress('U123');
    expect(email).toBe('test@example.com');
  });

  test('getChannelMembers should return members with emails', async () => {
    mockedWebClient.conversations.members.mockResolvedValue({ members: ['U1', 'U2'] });
    mockedWebClient.users.info
      .mockResolvedValueOnce({ user: { profile: { email: 'u1@example.com' } } })
      .mockResolvedValueOnce({ user: { profile: {} } }); // No email for U2

    const members = await getChannelMembers('C123');
    expect(members).toEqual([{ slackId: 'U1', email: 'u1@example.com' }]);
  });

  test('getChannelMembers should return empty if no members', async () => {
    mockedWebClient.conversations.members.mockResolvedValue({});
    const members = await getChannelMembers('C123');
    expect(members).toEqual([]);
  });

  test('scheduleMessage should call client.chat.scheduleMessage', async () => {
    mockedWebClient.chat.scheduleMessage.mockResolvedValue({ ok: true });
    const when = new Date();
    await scheduleMessage('C123', 'text', [], when);
    expect(mockedWebClient.chat.scheduleMessage).toHaveBeenCalledWith({
      channel: 'C123',
      text: 'text',
      blocks: [],
      post_at: Math.floor(when.getTime() / 1000)
    });
  });

  test('scheduleMessage should throw on error', async () => {
    mockedWebClient.chat.scheduleMessage.mockResolvedValue({ error: 'some_error' });
    await expect(scheduleMessage('C123', 'text', [], new Date())).rejects.toThrow("Error scheduling message: some_error");
  });

  test('postMessage should call client.chat.postMessage', async () => {
    await postMessage('C123', 'text', []);
    expect(mockedWebClient.chat.postMessage).toHaveBeenCalledWith({
      channel: 'C123',
      text: 'text',
      blocks: []
    });
  });

  test('postToResponseUrl should call axios.post', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await postToResponseUrl('http://url', 'ephemeral', 'text', []);
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test('postToResponseUrl should throw if status not 200', async () => {
    mockedAxios.post.mockResolvedValue({ status: 400, data: 'error' });
    await expect(postToResponseUrl('http://url', 'ephemeral', 'text', [])).rejects.toThrow();
  });

  test('postErrorMessageToResponseUrl should call postToResponseUrl', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await postErrorMessageToResponseUrl('http://url', 'error');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test('postEphemeralMessage should call client.chat.postEphemeral', async () => {
    await postEphemeralMessage('C123', 'U123', 'text', []);
    expect(mockedWebClient.chat.postEphemeral).toHaveBeenCalledWith({
      channel: 'C123',
      user: 'U123',
      text: 'text',
      blocks: []
    });
  });

  test('postEphmeralErrorMessage should call postEphemeralMessage', async () => {
    await postEphmeralErrorMessage('C123', 'U123', 'error');
    expect(mockedWebClient.chat.postEphemeral).toHaveBeenCalled();
  });
});
