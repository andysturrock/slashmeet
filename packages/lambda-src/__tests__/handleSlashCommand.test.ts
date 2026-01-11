import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { getSecretValue } from '../ts-src/awsAPI';
import { handleSlashCommand } from '../ts-src/handleSlashCommand';
import { openView } from '../ts-src/slackAPI';
import { getGCalToken } from '../ts-src/tokenStorage';
import { verifySlackRequest } from '../ts-src/verifySlackRequest';

const lambdaMock = mockClient(LambdaClient);

jest.mock('../ts-src/awsAPI');
jest.mock('../ts-src/tokenStorage');
jest.mock('../ts-src/slackAPI', () => ({
  ...jest.requireActual('../ts-src/slackAPI'),
  openView: jest.fn()
}));
jest.mock('../ts-src/verifySlackRequest');

const mockedGetSecretValue = getSecretValue as jest.MockedFunction<typeof getSecretValue>;
const mockedGetGCalToken = getGCalToken as jest.MockedFunction<typeof getGCalToken>;
const mockedOpenView = openView as jest.MockedFunction<typeof openView>;
const mockedVerifySlackRequest = verifySlackRequest as jest.MockedFunction<typeof verifySlackRequest>;

describe('handleSlashCommand', () => {
  beforeEach(() => {
    lambdaMock.reset();
    jest.clearAllMocks();
    mockedGetSecretValue.mockResolvedValue('secret');
  });

  const event: Partial<APIGatewayProxyEvent> = {
    body: 'token=gIkuvaNzQIHg97ATvDxqgjtO&team_id=T0001&team_domain=example&enterprise_id=E0001&enterprise_name=Globular%20Construct%20Inc&channel_id=C2147483705&channel_name=test&user_id=U2147483697&user_name=Steve&command=%2Fweather&text=94070&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2F1234%2F5678&trigger_id=13345224609.738474920.8088930838d88f008e0',
    headers: {}
  };

  test('should invoke LoginCommand when not logged in', async () => {
    mockedGetGCalToken.mockResolvedValue(undefined);
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

    const result = await handleSlashCommand(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(lambdaMock.calls()).toHaveLength(1);
    expect((lambdaMock.call(0).args[0].input as any).FunctionName).toBe('SlashMeet-handleLoginCommandLambda');
  });

  test('should open view and invoke MeetCommand when logged in', async () => {
    mockedGetGCalToken.mockResolvedValue('refresh-token');
    mockedOpenView.mockResolvedValue({ ok: true, view: { id: 'V123', hash: 'abc' } } as any);
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

    const result = await handleSlashCommand(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(mockedOpenView).toHaveBeenCalled();
    expect((lambdaMock.call(0).args[0].input as any).FunctionName).toBe('SlashMeet-handleMeetCommandLambda');
  });

  test('should invoke LogoutCommand on logout argument', async () => {
    mockedGetGCalToken.mockResolvedValue('refresh-token');
    const logoutEvent = { ...event, body: event.body!.replace('94070', 'logout') };
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

    const result = await handleSlashCommand(logoutEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('Logging out...');
    expect((lambdaMock.call(0).args[0].input as any).FunctionName).toBe('SlashMeet-handleLogoutCommandLambda');
  });

  test('should invoke LoginCommand on login argument', async () => {
    mockedGetGCalToken.mockResolvedValue('refresh-token');
    const loginEvent = { ...event, body: event.body!.replace('94070', 'login') };
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

    const result = await handleSlashCommand(loginEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect((lambdaMock.call(0).args[0].input as any).FunctionName).toBe('SlashMeet-handleLoginCommandLambda');
  });

  test('should return usage on invalid input', async () => {
    const invalidBody = 'token=gIkuvaNzQIHg97ATvDxqgjtO&team_id=T0001&user_id=U123&channel_id=C123&text=invalid';
    const invalidEvent = { ...event, body: invalidBody };
    const result = await handleSlashCommand(invalidEvent as APIGatewayProxyEvent);
    expect(result.body).toContain('There was an error.  Please contact support.');
  });

  test('should return error on lambda invoke failure', async () => {
    mockedGetGCalToken.mockResolvedValue(undefined);
    lambdaMock.on(InvokeCommand).resolves({ StatusCode: 500, FunctionError: 'Some error' });

    const result = await handleSlashCommand(event as APIGatewayProxyEvent);
    expect(result.body).toContain('There was an error');
  });
});
