import { APIGatewayProxyEvent } from 'aws-lambda';
import { Auth } from 'googleapis';
import { getSecretValue } from '../ts-src/awsAPI';
import { handleGoogleAuthRedirect } from '../ts-src/handleGoogleAuthRedirect';
import { deleteState, getState } from '../ts-src/stateTable';
import { saveGCalToken } from '../ts-src/tokenStorage';

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/stateTable');
jest.mock('../ts-src/tokenStorage');
jest.mock('googleapis', () => {
  const mOAuth2Client = {
    getToken: jest.fn(),
  };
  return {
    Auth: {
      OAuth2Client: jest.fn(() => mOAuth2Client),
    },
  };
});

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedGetState = getState as jest.MockedFunction<typeof getState>;
const mockedDeleteState = deleteState as jest.MockedFunction<typeof deleteState>;
const mockedSaveGCalToken = saveGCalToken as jest.MockedFunction<typeof saveGCalToken>;

describe('handleGoogleAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  const event: Partial<APIGatewayProxyEvent> = {
    queryStringParameters: { code: 'auth-code', state: 'mock-nonce' }
  };

  test('should handle success redirect', async () => {
    mockedGetState.mockResolvedValue({
      nonce: 'mock-nonce',
      slack_user_id: 'U123',
      response_url: 'http://res'
    });

    const mOAuth2Client = new Auth.OAuth2Client();
    (mOAuth2Client.getToken as jest.Mock).mockResolvedValue({ tokens: { refresh_token: 'refresh-token' } });

    const result = await handleGoogleAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('Authentication Success');
    expect(mockedSaveGCalToken).toHaveBeenCalledWith('refresh-token', 'U123');
    expect(mockedDeleteState).toHaveBeenCalledWith('mock-nonce');
  });

  test('should handle missing state', async () => {
    mockedGetState.mockResolvedValue(undefined);
    const result = await handleGoogleAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.body).toContain('Authentication Failure');
  });
});
