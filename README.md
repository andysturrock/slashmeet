# slashmeet
Slack slash command to create a GMeet meeting

## Installation instructions
1. Create a GCP project.
2. Enable the Calendar API.
3. Create an OAuth client id for a web application.
4. Set the redirect URL to `https://slashmeet.slackapps.example.com/0_0_1/google-oauth-redirect` (where example.com is your custom domain name).
5. Save the client id and client secret to AWS Secrets Manager
6. Create a Slack app using the file [manifests/slack_manifest.json](manifests/slack_manifest.json) as a basis.
7. Add a Slash Command with the Request URL set to `https://slashmeet.slackapps.example.com/0_0_1/meet`.
8. Check the OAuth scopes are as per the manifest.
9. Copy the Bot User OAuth Token to AWS Secrets Manager.
10. Copy the Signing Secret to AWS Secrets Manager.
11. Set the `CUSTOM_DOMAIN_NAME` and `LAMBDA_VERSION` in the [cdk/.env](cdk/env.template) file to the same values as step 4 (ie `https://slashmeet.${CUSTOM_DOMAIN_NAME}/${LAMBDA_VERSION}/google-oauth-redirect`).
12. Create a R53 hosted zone for the subdomain `slackapps.example.com`.  Update your root DNS with the NS records to do the subdomain delegation.
13. Add the custom domain name and R53 zone id to the [cdk/.env](cdk/env.template) file.
14. The secret in AWS Secrets Manager should be called `SlashMeet` and should look like the file [slashmeet-secret.json](slashmeet-secret.json).
15. The [cdk/.env](cdk/env.template) file should look like the file [cdk/env.template](cdk/env.template)
16. Create an app registration in Azure Portal/MS Entra using the file [manifests/aad_manifest.json](manifests/aad_manifest.json) as a basis.  Copy the relevant data to AWS Secrets Manager.

# CI/CD Setup with GitHub Actions

This repository uses GitHub Actions for continuous integration and deployment. The pipeline is designed to be secure and does not require hardcoded AWS credentials by using OpenID Connect (OIDC).

## Prerequisites

### 1. AWS OIDC Configuration (Automated)
You can automate the creation of the OIDC provider and the IAM role using the provided script. You must have the [AWS CLI](https://aws.amazon.com/cli/) installed and configured with appropriate permissions.

```bash
# Optional: Create a .env file to override defaults
# cp scripts/oidc.env.template .env

# Run the setup script
./scripts/setup-aws-oidc.sh
```

#### Note on Permissions:
To run the setup script locally, your AWS user needs specific IAM permissions (to create OIDC providers and roles). If you encounter `AccessDenied` errors, you can grant the required permissions using the provided policy file:

1. **Create the policy in AWS**:
   ```bash
   aws iam create-policy --policy-name SlashMeetOIDCSetupPolicy --policy-document file://scripts/setup-oidc-policy.json
   ```
2. **Attach the policy to your local user**:
   ```bash
   aws iam attach-user-policy --user-name <YOUR_USER_NAME> --policy-arn <POLICY_ARN_FROM_STEP_1>
   ```

The script will output the **Role ARN** which you should use in the next step.

---

### Alternative: Manual IAM Setup (Step-by-Step)
If you prefer to do this manually in the AWS Console:
1. **Create OIDC Provider**:
   - Go to IAM Console > Identity Providers > Add provider.
   - Provider Type: `OpenID Connect`.
   - Provider URL: `https://token.actions.githubusercontent.com` (Click "Get thumbprint").
   - Audience: `sts.amazonaws.com`.
2. **Create IAM Role**:
   - Create a new role with a **Custom trust policy**.
   - Use the following policy (Replace `<ACCOUNT_ID>` with your AWS Account ID):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:andysturrock/slashmeet:*"
        }
      }
    }
  ]
}
```
3. **Permissions**:
   - The setup script will automatically create and attach a scoped policy using [scripts/deploy-policy.json](scripts/deploy-policy.json). This policy follows the principle of least privilege, granting only the necessary permissions for CloudFormation, S3 (CDK assets), Lambda, API Gateway, DynamoDB, Route53, and Secrets Manager.

### 2. GitHub Secrets
Add the following secrets to your GitHub repository:
- `AWS_ROLE_TO_ASSUME`: The ARN of the IAM role created above.
- `AWS_REGION`: The AWS region where you want to deploy (e.g., `eu-west-2`).
- `CUSTOM_DOMAIN_NAME`: Your custom domain for the app (e.g., `example.com`).
- `R53_ZONE_ID`: The Route53 Zone ID for your custom domain.
- `LAMBDA_VERSION`: The version string for your deployment (e.g., `0_0_1`).

## Workflow Details
The [ci.yml](.github/workflows/ci.yml) workflow:
1. Runs on every push to the `main` branch.
2. Installs dependencies and runs unit tests across the monorepo.
3. Authenticates to AWS using GitHub's OIDC provider.
4. Deploys the infrastructure using the AWS CDK.

# Manual Deployment

If you want to deploy the application manually from your local machine (instead of using GitHub Actions), follow the detailed instructions in [packages/cdk/README.md](packages/cdk/README.md).

In summary:
1. Ensure your local environment is configured with AWS credentials.
2. Navigate to the `packages/cdk` directory.
3. Run `npm run build` to package the Lambda functions.
4. Run `npm run deploy` to deploy the infrastructure.
