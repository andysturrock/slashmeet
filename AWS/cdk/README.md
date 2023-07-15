## CDK for deploying the AWS infra for Slashmeet
### One time setup
1. Edit `iam-bootstrap-policy.json` to replace __ACCOUNTID__ with the account ID Slashmeet will run in.
2. In the AWS console, create a policy using your edited `iam-bootstrap-policy.json`.
3. Assign it to the user you will use for CDK.
4. Edit `~/.aws/credentials` to set up your CDK user profile and credentials.
5. Bootstrap CDK, passing the profile of your CDK user: `cdk bootstrap --profile=YOUR_CDK_PROFILE`.

### Deploy the infra and lambda
1. run `npm run build` to build the zipfile with Lambda source
2. run `npm run deploy` to deploy all the AWS stuff including if you need to update the Lambda from source.
