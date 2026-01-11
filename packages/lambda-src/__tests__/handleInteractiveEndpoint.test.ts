import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { WebClient } from '@slack/web-api';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import axios from 'axios';
import { getSecretValue } from '../ts-src/awsAPI';
import { handleInteractiveEndpoint } from '../ts-src/handleInteractiveEndpoint';

const lambdaMock = mockClient(LambdaClient);

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/verifySlackRequest');
jest.mock('axios');
jest.mock('@slack/web-api', () => {
  const mWebClient = {
    chat: { postMessage: jest.fn() }
  };
  return {
    WebClient: jest.fn(() => mWebClient),
    LogLevel: { INFO: 'info' }
  };
});

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedWebClient = new WebClient('token') as jest.Mocked<any>;

describe('handleInteractiveEndpoint', () => {
  beforeEach(() => {
    lambdaMock.reset();
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  test('should handle view_submission and invoke createMeetings lambda', async () => {
    const payload = {
      type: 'view_submission',
      user: { id: 'U123' },
      view: {
        private_metadata: JSON.stringify({ channelId: 'C123', startDate: new Date().toISOString(), now: true }),
        state: {
          values: {
            title: { title: { value: 'Test Meeting' } },
            meeting_start: { meeting_start: { selected_date_time: Math.floor(Date.now() / 1000) } },
            meeting_end: { meeting_end: { selected_date_time: Math.floor(Date.now() / 1000) + 3600 } },
            attendees: { attendees: { selected_users: ['U1'] } }
          }
        }
      }
    };
    const event = { body: `payload=${encodeURIComponent(JSON.stringify(payload))}`, headers: {} } as APIGatewayProxyEvent;

    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

    const result = await handleInteractiveEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(lambdaMock.calls()).toHaveLength(1);
    expect((lambdaMock.call(0).args[0].input as any).FunctionName).toBe('SlashMeet-handleCreateMeetingsLambda');
  });

  test('should handle block_actions for sign in buttons', async () => {
    const payload = {
      type: 'block_actions',
      actions: [{ action_id: 'googleSignInButton' }],
      response_url: 'http://response.url'
    };
    const event = { body: `payload=${encodeURIComponent(JSON.stringify(payload))}`, headers: {} } as APIGatewayProxyEvent;
    mockedAxios.post.mockResolvedValue({ status: 200 });

    const result = await handleInteractiveEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(mockedAxios.post).toHaveBeenCalledWith('http://response.url', { delete_original: 'true' });
  });

  test('should handle block_actions for join meeting button', async () => {
    const payload = {
      type: 'block_actions',
      actions: [{ action_id: 'joinMeetingButton' }],
      channel: { id: 'C123' },
      message: { ts: '123' },
      user: { id: 'U123' }
    };
    const event = { body: `payload=${encodeURIComponent(JSON.stringify(payload))}`, headers: {} } as APIGatewayProxyEvent;

    const result = await handleInteractiveEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(mockedWebClient.chat.postMessage).toHaveBeenCalled();
  });

  test('should return error when meeting title is missing', async () => {
    const payload = {
      type: 'view_submission',
      user: { id: 'U123' },
      view: {
        private_metadata: JSON.stringify({ channelId: 'C123', startDate: new Date().toISOString(), now: true }),
        state: {
          values: {
            title: { title: { value: undefined } },
            meeting_start: { meeting_start: { selected_date_time: 12345678 } },
            meeting_end: { meeting_end: { selected_date_time: 12345678 } },
            attendees: { attendees: { selected_users: ['U1'] } }
          }
        }
      }
    };
    const event = { body: 'payload=' + encodeURIComponent(JSON.stringify(payload)), headers: {} } as any;

    const result = await handleInteractiveEndpoint(event);
    expect(result.body).toContain('Error handling interaction');
  });

  test('should handle lambda invocation failure', async () => {
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 500 });
    const payload = {
      type: 'view_submission',
      user: { id: 'U123' },
      view: {
        private_metadata: JSON.stringify({ channelId: 'C123', startDate: new Date().toISOString(), now: true }),
        state: {
          values: {
            title: { title: { value: 'Test' } },
            meeting_start: { meeting_start: { selected_date_time: 12345678 } },
            meeting_end: { meeting_end: { selected_date_time: 12345678 } },
            attendees: { attendees: { selected_users: ['U1'] } }
          }
        }
      }
    };
    const event = { body: 'payload=' + encodeURIComponent(JSON.stringify(payload)), headers: {} } as any;

    const result = await handleInteractiveEndpoint(event);
    expect(result.body).toContain('Error handling interaction');
  });

  test('should handle default case in switch', async () => {
    const event = { body: 'payload=' + encodeURIComponent(JSON.stringify({ type: 'unknown' })), headers: {} } as any;
    const result = await handleInteractiveEndpoint(event);
    expect(result.statusCode).toBe(200);
  });
});
