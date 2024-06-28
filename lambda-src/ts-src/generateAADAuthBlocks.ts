import {AuthorizationUrlRequest, ConfidentialClientApplication, CryptoProvider, ResponseMode} from '@azure/msal-node';
import {ActionsBlock, KnownBlock, SectionBlock} from '@slack/bolt';
import crypto from 'crypto';
import {aadScopes} from './aadConfig';
import {State, putState} from './stateTable';

/**
 * Generate a button for Microsoft AAD/Entra login.
 * CSRF replay attacks are mitigated by using a nonce as the state param in the redirect URL.
 * The state is the primary key to the info in the SlashMeet_State table which is then queried in the redirect handler.
 * @param confidentialClientApplication initialised MSAL ConfidentialClientApplication object
 * @param slack_user_id Slack user id for the user signing in
 * @param response_url Response URL for use in the redirect handler to send messages to the Slack user
 * @returns blocks containing the "Sign in to Microsoft" button
 */
export async function generateAADAuthBlocks(confidentialClientApplication: ConfidentialClientApplication, redirectUri: string, slack_user_id: string, response_url: string) {
  const cryptoProvider = new CryptoProvider();
  const {verifier, challenge} = await cryptoProvider.generatePkceCodes();
  // Using a nonce for the state mitigates CSRF attacks.
  const nonce = crypto.randomBytes(16).toString('hex');
  const state: State = {
    nonce,
    slack_user_id,
    response_url,
    verifier
  };
  await putState(nonce, state);

  const authorizationUrlRequest: AuthorizationUrlRequest = {
    state: nonce,
    scopes: aadScopes,
    redirectUri,
    responseMode: ResponseMode.FORM_POST,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256',
    prompt: 'select_account'
  };
  const url = await confidentialClientApplication.getAuthCodeUrl(authorizationUrlRequest);

  const blocks: KnownBlock[] = [];
  const sectionBlock: SectionBlock = {
    type: "section",
    fields: [
      {
        type: "plain_text",
        text: "Sign in to Microsoft"
      }
    ]
  };
  blocks.push(sectionBlock);
  const actionsBlock: ActionsBlock = {
    type: "actions",
    block_id: "signInButton",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Sign in to Microsoft"
        },
        url,
        style: "primary",
        action_id: 'microsoftSignInButton'
      }
    ]
  };
  blocks.push(actionsBlock);
  return blocks;
}
