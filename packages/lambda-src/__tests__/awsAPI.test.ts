import { getSecretValue } from '../ts-src/awsAPI';

const mockSend = jest.fn();
jest.mock("@aws-sdk/client-secrets-manager", () => {
  return {
    SecretsManagerClient: jest.fn().mockImplementation(() => {
      return {
        send: mockSend
      };
    }),
    GetSecretValueCommand: jest.fn().mockImplementation((input) => ({ input }))
  };
});

describe('awsAPI - getSecretValue', () => {
  const secretName = 'test-secret';
  const secretKey = 'apiKey';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env[secretKey];
  });

  test('should return secret from environment if present', async () => {
    process.env[secretKey] = 'env-value';
    const result = await getSecretValue(secretName, secretKey);
    expect(result).toBe('env-value');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('should return secret from AWS if not in environment', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({ [secretKey]: 'aws-value' })
    });

    const result = await getSecretValue(secretName, secretKey);
    expect(result).toBe('aws-value');
    expect(mockSend).toHaveBeenCalled();
  });

  test('should throw error if secret key is missing in JSON', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({ otherKey: 'some-value' })
    });

    await expect(getSecretValue(secretName, secretKey)).rejects.toThrow(`Secret key ${secretKey} not found`);
  });

  test('should throw error if SecretString is empty', async () => {
    mockSend.mockResolvedValue({
      SecretString: undefined
    });

    await expect(getSecretValue(secretName, secretKey)).rejects.toThrow(`Secret ${secretName} not found`);
  });
});
