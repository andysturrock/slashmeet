import { DeleteItemCommand, DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { deleteState, getState, putState, State } from '../ts-src/stateTable';

const ddbMock = mockClient(DynamoDBClient);

describe('stateTable', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  const nonce = 'test-nonce';
  const state: State = {
    nonce,
    slack_user_id: 'user123',
    response_url: 'http://example.com',
    verifier: 'verifier123'
  };

  test('putState should call ddbClient.send with PutItemCommand', async () => {
    ddbMock.on(PutItemCommand).resolves({});
    await putState(nonce, state);
    expect(ddbMock.calls()).toHaveLength(1);
    const commandValue = ddbMock.call(0).args[0] as PutItemCommand;
    expect(commandValue.input.TableName).toBe('SlashMeet_State');
    expect(commandValue.input.Item?.nonce.S).toBe(nonce);
    expect(JSON.parse(commandValue.input.Item?.state.S || '{}')).toEqual(state);
  });

  test('getState should return state when item exists', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          state: { S: JSON.stringify(state) }
        }
      ]
    });
    const result = await getState(nonce);
    expect(result).toEqual(state);
  });

  test('getState should return undefined when item does not exist', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: []
    });
    const result = await getState(nonce);
    expect(result).toBeUndefined();
  });

  test('deleteState should call ddbClient.send with DeleteItemCommand', async () => {
    ddbMock.on(DeleteItemCommand).resolves({});
    await deleteState(nonce);
    expect(ddbMock.calls()).toHaveLength(1);
    const commandValue = ddbMock.call(0).args[0] as DeleteItemCommand;
    expect(commandValue.input.TableName).toBe('SlashMeet_State');
    expect(commandValue.input.Key?.nonce.S).toBe(nonce);
  });
});
