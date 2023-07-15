## CDK for deploying the AWS infra for Slashmeet
### One time setup
1. Create an IAM user to use for running CDK.  Best practice is to not use the root user for CDK.
2. Edit `iam-bootstrap-policy.json` to replace __ACCOUNTID__ with the account ID Slashmeet will run in.
3. In the AWS console, create a policy using your edited `iam-bootstrap-policy.json`.
4. Edit `iam-execution-policy.json` to replace __ACCOUNTID__ with the account ID Slashmeet will run in.
5. In the AWS console, create a policy using your edited `iam-execution-policy.json`.
6. Assign both policies to the IAM user you created for CDK in step 1.
7. Use the AWS console to create an access key and secret access key for your IAM user for CDK.
8. Edit `~/.aws/credentials` to set up your CDK user profile and store the credentials from step 7.
9. Bootstrap CDK, passing the profile of your CDK user: `cdk bootstrap --profile=YOUR_CDK_PROFILE`.

### Deploy the infra and lambda
1. run `npm run build` to build the zipfile with Lambda source
2. run `npm run deploy` to deploy all the AWS stuff including if you need to update the Lambda from source.
