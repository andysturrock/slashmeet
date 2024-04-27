import {Auth} from 'googleapis';
import crypto from 'crypto';
import {State, putState} from './stateTable';
import {ActionsBlock, KnownBlock, SectionBlock} from '@slack/bolt';

/**
 * Generate a button for Google login.
 * CSRF replay attacks are mitigated by using a nonce as the state param in the redirect URL.
 * The state is the primary key to the info in the SlashMeet_State table which is then queried in the redirect handler.
 * @param oauth2Client Initialised Google SDK OAuth2Client object
 * @param slack_user_id Slack user id for the user signing in
 * @param response_url Response URL for use in the redirect handler to send messages to the Slack user
 * @returns blocks containing the "Sign in to Google" button
 */
export async function generateGoogleAuthBlocks(oauth2Client: Auth.OAuth2Client, slack_user_id: string, response_url: string) {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'profile',
  ];

  // Using a nonce for the state mitigates CSRF attacks.
  const nonce = crypto.randomBytes(16).toString('hex');
  const state: State = {
    nonce,
    slack_user_id,
    response_url
  };

  await putState(nonce, state);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' '),
    state: nonce,
    prompt: 'consent'
  });

  const blocks: KnownBlock[] = [];
  const sectionBlock: SectionBlock = {
    type: "section",
    fields: [
      {
        type: "plain_text",
        text: "Sign in to Google"
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
          text: "Sign in to Google"
        },
        url,
        style: "primary",
        action_id: 'googleSignInButton'
      }
    ]
  };
  blocks.push(actionsBlock);
  return blocks;
}
