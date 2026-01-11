import { deleteAADToken, deleteGCalToken, getAADToken, getGCalToken, saveAADToken, saveGCalToken } from '../ts-src/tokenStorage';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => {
      return {
        send: mockSend
      };
    }),
    QueryCommand: jest.fn().mockImplementation((input) => ({ input })),
    PutItemCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteItemCommand: jest.fn().mockImplementation((input) => ({ input }))
  };
});

describe('tokenStorage', () => {
  const slackUserId = 'U12345';
  const token = 'refresh-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getGCalToken should return token if found', async () => {
    mockSend.mockResolvedValue({
      Items: [{ refresh_token: { S: token } }]
    });
    const result = await getGCalToken(slackUserId);
    expect(result).toBe(token);
    expect(mockSend).toHaveBeenCalled();
  });

  test('getGCalToken should return undefined if not found', async () => {
    mockSend.mockResolvedValue({ Items: [] });
    const result = await getGCalToken(slackUserId);
    expect(result).toBeUndefined();
  });

  test('saveGCalToken should call PutItemCommand', async () => {
    await saveGCalToken(token, slackUserId);
    expect(mockSend).toHaveBeenCalled();
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.input.TableName).toBe("SlashMeet_SlackIdToGCalToken");
    expect(callArgs.input.Item.slack_id.S).toBe(slackUserId);
    expect(callArgs.input.Item.refresh_token.S).toBe(token);
  });

  test('deleteGCalToken should call DeleteItemCommand', async () => {
    await deleteGCalToken(slackUserId);
    expect(mockSend).toHaveBeenCalled();
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.input.TableName).toBe("SlashMeet_SlackIdToGCalToken");
    expect(callArgs.input.Key.slack_id.S).toBe(slackUserId);
  });

  test('getAADToken should return token if found', async () => {
    mockSend.mockResolvedValue({
      Items: [{ refresh_token: { S: token } }]
    });
    const result = await getAADToken(slackUserId);
    expect(result).toBe(token);
  });

  test('saveAADToken should call PutItemCommand', async () => {
    await saveAADToken(token, slackUserId);
    expect(mockSend).toHaveBeenCalled();
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.input.TableName).toBe("SlashMeet_SlackIdToAADToken");
  });

  test('deleteAADToken should call DeleteItemCommand', async () => {
    await deleteAADToken(slackUserId);
    expect(mockSend).toHaveBeenCalled();
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.input.TableName).toBe("SlashMeet_SlackIdToAADToken");
  });
});
