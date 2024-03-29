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

# CICD setup in GitLab
There is a simple .gitlab-ci.yml file provided.  It uses OIDC tokens to get temporary credentials.  The pipeline needs the following variables:
 - GITLAB_ROLE_ARN - the AWS IAM role for running the pipeline.  See https://docs.gitlab.com/ee/ci/cloud_services/aws/index.html
 - AWS_DEFAULT_REGION - the AWS deployment region.  May be overridden in the cdk code.
 - LAMBDA_VERSION - see above
 - R53_ZONE_ID - see above
 - CUSTOM_DOMAIN_NAME - see above