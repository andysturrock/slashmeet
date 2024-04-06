import {SecretsManagerClient, GetSecretValueCommand, SecretsManagerClientConfig, GetSecretValueRequest} from "@aws-sdk/client-secrets-manager";

/**
 * Get a secret value from AWS Secrets Manager
 * @param secretName Name of the secrets
 * @param secretKey Key of the secret.  The secret is assumed to be stored as JSON text.
 * @returns The secret value as a string
 * @throws AccessDeniedException if the caller doesn't have access to that secret or Error if the secret or key don't exist
 */
export async function getSecretValue(secretName: string, secretKey: string) {

  const envSecret = process.env[secretKey];
  if(envSecret) {
    return envSecret;
  }

  const configuration: SecretsManagerClientConfig = {
    region: 'eu-west-2'
  };
  
  const client = new SecretsManagerClient(configuration);
  const input: GetSecretValueRequest = { // GetSecretValueRequest
    SecretId: secretName,
  };
  const command = new GetSecretValueCommand(input);
  const response = await client.send(command);

  if(!response.SecretString) {
    throw new Error(`Secret ${secretName} not found`);
  }

  type SecretValue = {
    [key: string]: string;
 };
  const secrets = JSON.parse(response.SecretString) as SecretValue;

  const secret = secrets[secretKey];
  if(!secret) {
    throw new Error(`Secret key ${secretKey} not found`);
  }
  return secret;
}