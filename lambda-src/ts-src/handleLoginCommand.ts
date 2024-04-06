import {generateGoogleAuthBlocks} from './generateGoogleAuthBlocks';
import {Auth} from 'googleapis';
import {getSecretValue} from './awsAPI';
import {SlashCommandPayload, postErrorMessageToResponseUrl, postToResponseUrl} from './slackAPI';
import {ConfidentialClientApplication, Configuration} from "@azure/msal-node";
import {generateAADAuthBlocks} from './generateAADAuthBlocks';

/**
 * Log the user into AAD/Entra and Google and connect slashMeet to those.
 * @param event the payload from the slash command
 */
export async function handleLoginCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;
  try {

    const gcpClientId = await getSecretValue('SlashMeet', 'gcpClientId');
    const gcpClientSecret = await getSecretValue('SlashMeet', 'gcpClientSecret');
    const slashMeetUrl = await getSecretValue('SlashMeet', 'slashMeetUrl');
    const gcpRedirectUri = `${slashMeetUrl}/google-oauth-redirect`;

    // const aadClientId = await getSecretValue('SlashMeet', 'aadClientId');
    // const aadTenantId = await getSecretValue('SlashMeet', 'aadTenantId');
    // const aadClientSecret = await getSecretValue('SlashMeet', 'aadClientSecret');
    // const aadRedirectUri = `${slashMeetUrl}/aad-oauth-redirect`;

    // const msalConfig: Configuration = {
    //   auth: {
    //     clientId: aadClientId,
    //     authority: `https://login.microsoftonline.com/${aadTenantId}`,
    //     clientSecret: aadClientSecret
    //   }
    // };
    // const confidentialClientApplication = new ConfidentialClientApplication(msalConfig);
  
    // const aadAuthBlocks = await generateAADAuthBlocks(confidentialClientApplication, aadRedirectUri, event.user_id, event.response_url);
    // await postToResponseUrl(responseUrl, "ephemeral", "Sign in to Microsoft", aadAuthBlocks);

    const oAuth2ClientOptions: Auth.OAuth2ClientOptions = {
      clientId: gcpClientId,
      clientSecret: gcpClientSecret,
      redirectUri: gcpRedirectUri
    };
    const oauth2Client = new Auth.OAuth2Client(oAuth2ClientOptions);

    const googleAuthBlocks = await generateGoogleAuthBlocks(oauth2Client, event.user_id, event.response_url);
    await postToResponseUrl(responseUrl, "ephemeral", "Sign in to Google", googleAuthBlocks);
  }
  catch (error) {
    console.error(error);
    await postErrorMessageToResponseUrl(responseUrl, "Failed to log into AAD and Google");
  }
}
