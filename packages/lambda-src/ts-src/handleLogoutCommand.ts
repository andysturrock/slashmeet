import { KnownBlock } from '@slack/web-api';
import { SlashCommandPayload, postErrorMessageToResponseUrl, postToResponseUrl } from './slackAPI';
import { deleteAADToken, deleteGCalToken } from './tokenStorage';

/**
 * Remove the connection between slashMeet and AAD/Entra and Google.
 * Note this doesn't log the user out from AAD/Entra and Google.
 * @param event Payload of the slash command
 */
export async function handleLogoutCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;

  try {
    await deleteAADToken(event.user_id);
    await deleteGCalToken(event.user_id);

    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Logged out successfully"
        }
      }
    ];
    await postToResponseUrl(responseUrl, "ephemeral", "Logged out successfully", blocks);
  }
  catch (error) {
    console.error(error);
    await postErrorMessageToResponseUrl(responseUrl, "Failed to log out of AAD and Google");
  }
}
