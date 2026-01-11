import { ConfidentialClientApplication } from '@azure/msal-node';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getSecretValue } from '../ts-src/awsAPI';
import { handleAADAuthRedirect } from '../ts-src/handleAADAuthRedirect';
import { deleteState, getState } from '../ts-src/stateTable';
import { saveAADToken } from '../ts-src/tokenStorage';

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/stateTable');
jest.mock('../ts-src/tokenStorage');
jest.mock('@azure/msal-node');

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedGetState = getState as jest.MockedFunction<typeof getState>;
const mockedDeleteState = deleteState as jest.MockedFunction<typeof deleteState>;
const mockedSaveAADToken = saveAADToken as jest.MockedFunction<typeof saveAADToken>;

describe('handleAADAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  const event: Partial<APIGatewayProxyEvent> = {
    body: 'code=auth-code&state=mock-nonce'
  };

  test('should handle success redirect', async () => {
    mockedGetState.mockResolvedValue({
      nonce: 'mock-nonce',
      slack_user_id: 'U123',
      response_url: 'http://res',
      verifier: 'verifier'
    });

    const mConfidentialClientApplication = {
      acquireTokenByCode: jest.fn().mockResolvedValue({}),
      getTokenCache: jest.fn().mockReturnValue({
        getKVStore: jest.fn().mockReturnValue({
          'key': { credentialType: 'RefreshToken', secret: 'refresh-token' }
        })
      })
    };
    (ConfidentialClientApplication as jest.Mock).mockReturnValue(mConfidentialClientApplication);

    const result = await handleAADAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('Authentication Success');
    expect(mockedSaveAADToken).toHaveBeenCalledWith('refresh-token', 'U123');
    expect(mockedDeleteState).toHaveBeenCalledWith('mock-nonce');
  });

  test('should handle missing state', async () => {
    mockedGetState.mockResolvedValue(undefined);
    const result = await handleAADAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.body).toContain('Authentication Failure');
  });
});
