import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecretsManagerStack } from '../lib/secretsmanager-stack';

describe('SecretsManagerStack', () => {
  test('SecretsManagerStack references the correct secret', () => {
    const app = new cdk.App();
    const stack = new SecretsManagerStack(app, 'TestStack', {
      env: { region: 'eu-west-2' },
      customDomainName: 'example.com'
    });
    const template = Template.fromStack(stack);

    // SecretsManagerStack calls fromSecretNameV2 which doesn't create a resource, 
    // it just creates a reference. However, the stack exports the Arnhem.
    const json = template.toJSON();
    expect(json.Outputs).toBeDefined();
    expect(Object.values(json.Outputs).some((output: any) =>
      output.Export && output.Export.Name === 'slashMeetSecret'
    )).toBeTruthy();
  });
});
