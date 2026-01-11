import { getSecretValue } from '../ts-src/awsAPI';
import { generateAADAuthBlocks } from '../ts-src/generateAADAuthBlocks';
import { generateGoogleAuthBlocks } from '../ts-src/generateGoogleAuthBlocks';
import { handleLoginCommand } from '../ts-src/handleLoginCommand';
import { postErrorMessageToResponseUrl, postToResponseUrl } from '../ts-src/slackAPI';

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/slackAPI');
jest.mock('../ts-src/generateAADAuthBlocks');
jest.mock('../ts-src/generateGoogleAuthBlocks');
jest.mock('@azure/msal-node');

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedPostToResponseUrl = postToResponseUrl as jest.MockedFunction<typeof postToResponseUrl>;
const mockedPostErrorMessageToResponseUrl = postErrorMessageToResponseUrl as jest.MockedFunction<typeof postErrorMessageToResponseUrl>;
const mockedGenerateAADAuthBlocks = generateAADAuthBlocks as jest.MockedFunction<typeof generateAADAuthBlocks>;
const mockedGenerateGoogleAuthBlocks = generateGoogleAuthBlocks as jest.MockedFunction<typeof generateGoogleAuthBlocks>;

describe('handleLoginCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  const event = {
    user_id: 'U123',
    response_url: 'http://response.url'
  } as any;

  test('should generate blocks and post to response URL', async () => {
    mockedGenerateAADAuthBlocks.mockResolvedValue([{ type: 'section', text: { type: 'plain_text', text: 'MS' } }] as any);
    mockedGenerateGoogleAuthBlocks.mockResolvedValue([{ type: 'section', text: { type: 'plain_text', text: 'Google' } }] as any);

    await handleLoginCommand(event);

    expect(mockedGenerateAADAuthBlocks).toHaveBeenCalled();
    expect(mockedGenerateGoogleAuthBlocks).toHaveBeenCalled();
    expect(mockedPostToResponseUrl).toHaveBeenCalledTimes(2);
  });

  test('should handle errors and post error message', async () => {
    mockedGenerateAADAuthBlocks.mockRejectedValue(new Error('Auth error'));

    await handleLoginCommand(event);

    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Failed to log into AAD and Google'));
  });

  test('should handle existing AAD token (no blocks generated)', async () => {
    mockedGenerateAADAuthBlocks.mockResolvedValue([]);
    mockedGenerateGoogleAuthBlocks.mockResolvedValue([]);

    await handleLoginCommand(event);

    expect(mockedGenerateAADAuthBlocks).toHaveBeenCalled();
    expect(mockedGenerateGoogleAuthBlocks).toHaveBeenCalled();
    expect(mockedPostToResponseUrl).not.toHaveBeenCalled();
  });
});
