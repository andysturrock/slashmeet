import { verifySlackRequest as _verifySlackRequest } from '@slack/bolt/dist/receivers/verify-request';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { verifySlackRequest } from '../ts-src/verifySlackRequest';

jest.mock('@slack/bolt/dist/receivers/verify-request', () => ({
  verifySlackRequest: jest.fn()
}));

describe('verifySlackRequest', () => {
  const signingSecret = 'secret';
  const body = 'body';

  test('should throw error if X-Slack-Signature is missing', () => {
    const headers = { 'X-Slack-Request-Timestamp': '123456789' };
    expect(() => verifySlackRequest(signingSecret, headers, body)).toThrow("Missing X-Slack-Signature header");
  });

  test('should throw error if X-Slack-Request-Timestamp is missing', () => {
    const headers = { 'X-Slack-Signature': 'v0=signature' };
    expect(() => verifySlackRequest(signingSecret, headers, body)).toThrow("Missing X-Slack-Request-Timestamp header");
  });

  test('should call _verifySlackRequest with correct options', () => {
    const headers = {
      'X-Slack-Signature': 'v0=signature',
      'X-Slack-Request-Timestamp': '123456789'
    };
    verifySlackRequest(signingSecret, headers, body);
    expect(_verifySlackRequest).toHaveBeenCalledWith({
      signingSecret,
      body,
      headers: {
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': 123456789
      }
    });
  });

  test('should handle headers as arrays', () => {
    const headers = {
      'X-Slack-Signature': ['v0=signature'],
      'X-Slack-Request-Timestamp': ['123456789']
    } as unknown as APIGatewayProxyEventHeaders;
    verifySlackRequest(signingSecret, headers, body);
    expect(_verifySlackRequest).toHaveBeenCalledWith({
      signingSecret,
      body,
      headers: {
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': 123456789
      }
    });
  });
});
