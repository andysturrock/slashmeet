import { APIGatewayProxyEvent } from 'aws-lambda';
import { handleEventsEndpoint } from '../ts-src/handleEventsEndpoint';

describe('handleEventsEndpoint', () => {
  test('should return 200 ok for generic body', () => {
    const event = { body: JSON.stringify({ type: 'some_event' }) } as APIGatewayProxyEvent;
    const result = handleEventsEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ msg: 'ok' });
  });

  test('should return challenge for url_verification', () => {
    const event = {
      body: JSON.stringify({ type: 'url_verification', challenge: 'test-challenge' })
    } as APIGatewayProxyEvent;
    const result = handleEventsEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('test-challenge');
    expect(result.headers?.['Content-Type']).toBe('text/plain');
  });

  test('should handle error on missing body', () => {
    const event = {} as APIGatewayProxyEvent;
    const result = handleEventsEndpoint(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });
});
