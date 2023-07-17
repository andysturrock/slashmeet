# slashmeet
Slack slash command to create a GMeet meeting

## Installation instructions
1. Create a GCP project.
2. Enable the Calendar API.
3. Create an OAuth client id for a web application.
4. Set the redirect URL to https://slackapps.example.com/0_0_1/redirectUri (where example.com is your custom domain name) .
5. Save the client id and client secret to the .env file in the AWS/cdk directory (or GCP directory if using GCP functions).
6. Create a Slack app.
7. Add a Slash Command with the Request URL set to https://slashmeet.slackapps.example.com/0_0_1/meet.
8. Add an OAuth scope for `users:read`.  It should already have `commands` scope.
9. Copy the Bot User OAuth Token to the .env file.
10. Copy the Signing Secret to the .env file.
11. Set the REDIRECT_URL in the .env file to the same value as step 4.
12. For AWS, create a R53 hosted zone for the subdomain slackapps.example.com.  Update your root DNS with the NS records to do the subdomain delegation.
13. Add the custom domain name and R53 zone id to the .env file.
