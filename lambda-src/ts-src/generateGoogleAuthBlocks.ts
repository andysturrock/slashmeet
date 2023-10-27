import {Auth} from 'googleapis';

export function generateGoogleAuthBlocks(oauth2Client: Auth.OAuth2Client, userId:string) {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'profile',
  ];

  // TODO - use state to verify callback came from here.
  const state = {
    // Slack seems to use snake_case for JSON field names so we'll follow that convention.
    user_id: userId
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' '),
    state: encodeURIComponent(JSON.stringify(state)),
    prompt: 'consent'
  });

  const blocks = {
    "blocks": [
      {
        type: "section",
        fields: [
          {
            type: "plain_text",
            text: "Sign in to Google"
          }
        ]
      },
      {
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
      }
    ]
  };
  return blocks;
}
