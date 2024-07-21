import { Block, KnownBlock, View } from "@slack/bolt";
import { LogLevel, ViewsOpenArguments, ViewsUpdateArguments, WebClient } from "@slack/web-api";
import axios from 'axios';
import util from 'util';
import { getSecretValue } from './awsAPI';

async function createClient() {
  const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');

  return new WebClient(slackBotToken, {
    logLevel: LogLevel.INFO
  });
}

export async function openView(trigger_id: string, view: View) {
  const client = await createClient();
  const viewsOpenArguments: ViewsOpenArguments = {
    trigger_id,
    view
  };
  return await client.views.open(viewsOpenArguments);
}

export async function updateView(view_id: string, hash: string, view: View) {
  const client = await createClient();
  const viewsUpdateArguments: ViewsUpdateArguments = {
    view_id,
    hash,
    view
  };
  return await client.views.update(viewsUpdateArguments);
}

export async function getSlackUserTimeZone(userId: string) {
  const client = await createClient();
  const result = await client.users.info({
    user: userId
  });
  if(!result.user?.tz) {
    throw new Error("Cannot get timezone from user object");
  }
  return result.user.tz;
}

export async function getUserEmailAddress(userId: string) {
  const client = await createClient();
  const userResult = await client.users.info({
    user: userId
  });
  return userResult.user?.profile?.email;
}

export type ChannelMember = {
  slackId: string,
  email: string
};
/**
 * Find user ids and email addresses of members of a channel.
 * The calling bot must be a member of a private channel or DM
 * and have the requisite scopes.
 * @param channelId channel id
 * @returns list of ChannelMember instances, empty
 */
export async function getChannelMembers(channelId: string) {
  const client = await createClient();
  const membersResult = await client.conversations.members({
    channel: channelId
  });
  const channelMembers: ChannelMember[] = [];
  if(!membersResult.members) {
    console.warn(`Cannot get members of channel ${channelId}`);
    return channelMembers;
  }
  for(const member of membersResult.members) {
    const userResult = await client.users.info({
      user: member
    });
    if(userResult.user?.profile?.email) {
      channelMembers.push({
        slackId: member,
        email: userResult.user.profile.email
      });
    }
    else {
      // This is probably OK as it should only be bot users that don't have an email address and
      // we don't want to invite bot users (including ourself) to the meeting anyway.
      console.warn(`Cannot find email address for Slack user ${member}`);
    }
  }
  return channelMembers;
}

export async function scheduleMessage(channelId: string, text:string, blocks: (KnownBlock | Block)[], when: Date) {
  const client = await createClient();
  const response = await client.chat.scheduleMessage({
    channel: channelId,
    text,
    blocks,
    post_at: Math.floor(when.getTime() / 1000)
  });
  if(response.error) {
    throw new Error(`Error scheduling message: ${response.error}`);
  }
}

export async function postMessage(channelId: string, text:string, blocks: (KnownBlock | Block)[]) {
  const client = await createClient();
  await client.chat.postMessage({
    channel: channelId,
    text,
    blocks
  });
}

export async function postToResponseUrl(responseUrl: string, response_type: "ephemeral" | "in_channel", text: string, blocks: KnownBlock[]) {
  const messageBody = {
    response_type,
    text,
    blocks
  };
  const result = await axios.post(responseUrl, messageBody);
  if(result.status !== 200) {
    throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
  }
  return result;
}

export async function postErrorMessageToResponseUrl(responseUrl: string, text: string) {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text
      }
    }
  ];
  await postToResponseUrl(responseUrl, "ephemeral", text, blocks);
}

export async function postEphemeralMessage(channelId: string, userId: string, text:string, blocks: (KnownBlock | Block)[]) {
  const client = await createClient();
  await client.chat.postEphemeral({
    user: userId,
    channel: channelId,
    text,
    blocks
  });  
}

export async function postEphmeralErrorMessage(channelId: string, userId:string, text: string) {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text
      }
    }
  ];
  await postEphemeralMessage(channelId, userId, text, blocks);
}

export type SlashCommandPayload = {
  token: string,
  team_id: string,
  team_domain: string,
  channel_id: string,
  channel_name: string,
  user_id: string,
  user_name: string,
  command: string,
  text: string,
  api_app_id: string,
  is_enterprise_install: string,
  response_url: string,
  trigger_id: string,
  view_id?: string,
  view_hash?: string
};

export type Action = {
  action_id: string,
  value: string
};

export type InteractionPayload = {
  type: string,
  user: {
    id: string,
    username: string,
    name: string,
    team_id: string,
  },
  container: {
    type: string,
    message_ts: string,
    channel_id: string,
    is_ephemeral: boolean
  },
  team: {
    id: string,
    domain: string
  },
  channel: {
    id: string,
    name: string,
  },
  message: {
    type: 'message',
    subtype: string,
    text: string,
    ts: string,
    bot_id: string,
  },
  response_url: string,
  actions: Action[]
};