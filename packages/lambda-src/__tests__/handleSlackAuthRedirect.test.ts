import { APIGatewayProxyEvent } from 'aws-lambda';
import axios from 'axios';
import { getSecretValue } from '../ts-src/awsAPI';
import { handleSlackAuthRedirect } from '../ts-src/handleSlackAuthRedirect';

jest.mock('../ts-src/awsAPI');
jest.mock('axios');

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleSlackAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  const event: Partial<APIGatewayProxyEvent> = {
    queryStringParameters: { code: 'auth-code', state: 'mock-nonce' }
  };

  test('should handle success redirect', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        ok: true,
        team: { name: 'Test Team' },
        authed_user: { id: 'U123' }
      }
    });

    const result = await handleSlackAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('Installation Success');
    expect(result.body).toContain('Test Team');
  });

  test('should handle error from Slack', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { ok: false, error: 'invalid_code' }
    });

    const result = await handleSlackAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.body).toContain('Installation Failure');
  });
  test('should handle enterprise success redirect', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        ok: true,
        enterprise: { name: 'Test Org' },
        authed_user: { id: 'U123' }
      }
    });

    const result = await handleSlackAuthRedirect(event as APIGatewayProxyEvent);
    expect(result.body).toContain('Successfully installed SlashMeet in organisation Test Org');
  });

  test('should return failure if query params missing', async () => {
    const result = await handleSlackAuthRedirect({} as any);
    expect(result.body).toContain('Installation Failure');
  });
});
