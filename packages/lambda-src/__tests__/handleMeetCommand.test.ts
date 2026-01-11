import { createModalView } from '../ts-src/createModalView';
import { handleMeetCommand } from '../ts-src/handleMeetCommand';
import { parseMeetingArgs } from '../ts-src/parseMeetingArgs';
import { getChannelMembers, getSlackUserTimeZone, postErrorMessageToResponseUrl, updateView } from '../ts-src/slackAPI';
import { getAADToken } from '../ts-src/tokenStorage';

jest.mock('../ts-src/slackAPI');
jest.mock('../ts-src/tokenStorage');
jest.mock('../ts-src/createModalView');
jest.mock('../ts-src/parseMeetingArgs');

const mockedGetSlackUserTimeZone = getSlackUserTimeZone as jest.MockedFunction<typeof getSlackUserTimeZone>;
const mockedGetChannelMembers = getChannelMembers as jest.MockedFunction<typeof getChannelMembers>;
const mockedPostErrorMessageToResponseUrl = postErrorMessageToResponseUrl as jest.MockedFunction<typeof postErrorMessageToResponseUrl>;
const mockedUpdateView = updateView as jest.MockedFunction<typeof updateView>;
const mockedGetAADToken = getAADToken as jest.MockedFunction<typeof getAADToken>;
const mockedCreateModalView = createModalView as jest.MockedFunction<typeof createModalView>;
const mockedParseMeetingArgs = parseMeetingArgs as jest.MockedFunction<typeof parseMeetingArgs>;

describe('handleMeetCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const event = {
    user_id: 'U123',
    response_url: 'http://response.url',
    view_id: 'V123',
    view_hash: 'abc',
    text: 'meeting',
    channel_id: 'C123'
  } as any;

  test('should update view with meeting options and channel members', async () => {
    mockedGetSlackUserTimeZone.mockResolvedValue('Europe/London');
    mockedParseMeetingArgs.mockReturnValue({ name: 'meeting' } as any);
    mockedGetAADToken.mockResolvedValue('aad-token');
    mockedCreateModalView.mockReturnValue({ type: 'modal' } as any);
    mockedUpdateView.mockResolvedValue({ ok: true, view: { id: 'V123', hash: 'def' } } as any);
    mockedGetChannelMembers.mockResolvedValue([{ slackId: 'U1', email: 'u1@example.com' }]);

    await handleMeetCommand(event);

    expect(mockedGetSlackUserTimeZone).toHaveBeenCalled();
    expect(mockedParseMeetingArgs).toHaveBeenCalled();
    expect(mockedUpdateView).toHaveBeenCalledTimes(2);
    expect(mockedGetChannelMembers).toHaveBeenCalled();
    expect(mockedCreateModalView).toHaveBeenCalledTimes(2);
  });

  test('should handle updateView failure', async () => {
    mockedGetSlackUserTimeZone.mockResolvedValue('Europe/London');
    mockedParseMeetingArgs.mockReturnValue({ name: 'meeting' } as any);
    mockedUpdateView.mockResolvedValue({ ok: false, error: 'some error' } as any);

    await handleMeetCommand(event);

    expect(mockedUpdateView).toHaveBeenCalled();
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalled();
  });

  test('should handle missing view_id', async () => {
    const invalidEvent = { ...event, view_id: undefined };
    await handleMeetCommand(invalidEvent as any);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Failed to create GMeet meeting'));
  });

  test('should handle timezone error', async () => {
    mockedGetSlackUserTimeZone.mockRejectedValue(new Error('TZ error'));
    await handleMeetCommand(event);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Error getting user\'s timezone'));
  });

  test('should fail if view_hash is missing', async () => {
    const invalidEvent = { ...event, view_hash: undefined };
    await handleMeetCommand(invalidEvent as any);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Failed to create GMeet meeting'));
  });

  test('should handle parseMeetingArgs failure', async () => {
    mockedGetSlackUserTimeZone.mockResolvedValue('UTC');
    mockedParseMeetingArgs.mockImplementation(() => { throw new Error('parse fail'); });
    await handleMeetCommand(event);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Error parsing meeting options'));
  });

  test('should handle getChannelMembers failure', async () => {
    mockedGetSlackUserTimeZone.mockResolvedValue('UTC');
    mockedParseMeetingArgs.mockReturnValue({ name: 'meeting' } as any);
    mockedUpdateView.mockResolvedValue({ ok: true, view: { id: 'V1', hash: 'H1' } } as any);
    mockedGetChannelMembers.mockRejectedValue(new Error('List failure'));
    await handleMeetCommand(event);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('private channel'));
  });

  test('should fail if update response is missing hash', async () => {
    mockedGetSlackUserTimeZone.mockResolvedValue('UTC');
    mockedParseMeetingArgs.mockReturnValue({ name: 'meeting' } as any);
    mockedUpdateView.mockResolvedValue({ ok: true, view: { id: 'V1', hash: undefined } } as any);
    await handleMeetCommand(event);
    expect(mockedPostErrorMessageToResponseUrl).toHaveBeenCalledWith('http://response.url', expect.stringContaining('Failed to create GMeet meeting'));
  });
});
