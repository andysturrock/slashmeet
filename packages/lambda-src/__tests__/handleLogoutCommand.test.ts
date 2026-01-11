import { handleLogoutCommand } from '../ts-src/handleLogoutCommand';
import { postErrorMessageToResponseUrl, postToResponseUrl } from '../ts-src/slackAPI';
import { deleteAADToken, deleteGCalToken } from '../ts-src/tokenStorage';

jest.mock('../ts-src/tokenStorage');
jest.mock('../ts-src/slackAPI');

const mockedDeleteAADToken = deleteAADToken as jest.MockedFunction<typeof deleteAADToken>;
const mockedDeleteGCalToken = deleteGCalToken as jest.MockedFunction<typeof deleteGCalToken>;
const mockedPostToResponseUrl = postToResponseUrl as jest.MockedFunction<typeof postToResponseUrl>;
const mockedPostErrorMessageToResponseUrl = postErrorMessageToResponseUrl as jest.MockedFunction<typeof postErrorMessageToResponseUrl>;

describe('handleLogoutCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const event = {
    user_id: 'U123',
    response_url: 'http://response.url'
  } as any;

  test('should delete tokens and post success message', async () => {
    await handleLogoutCommand(event);

    expect(mockedDeleteAADToken).toHaveBeenCalledWith('U123');
    expect(mockedDeleteGCalToken).toHaveBeenCalledWith('U123');
    expect(mockedPostToResponseUrl).toHaveBeenCalledWith('http://response.url', 'ephemeral', 'Logged out successfully', expect.any(Array));
  });

  test('should handle deleteGCalToken error', async () => {
    mockedDeleteGCalToken.mockRejectedValue(new Error('GCal delete error'));
    await handleLogoutCommand(event);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalled();
  });

  test('should handle errors and post error message', async () => {
    mockedDeleteAADToken.mockRejectedValue(new Error('Delete error'));

    await handleLogoutCommand(event);

    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Failed to log out of AAD and Google'));
  });
});
