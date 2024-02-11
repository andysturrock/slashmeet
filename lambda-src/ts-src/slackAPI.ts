import {WebClient, LogLevel} from "@slack/web-api";
import {getSecretValue} from './awsAPI';
import {Block, KnownBlock} from "@slack/bolt";

async function createClient() {
  const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');

  return new WebClient(slackBotToken, {
    logLevel: LogLevel.INFO
  });
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

export type ChannelMember = {
  slackId: string,
  email: string
};
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
        email: userResult.user?.profile?.email
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
  await client.chat.scheduleMessage({
    channel: channelId,
    text,
    blocks,
    post_at: Math.floor(when.getTime() / 1000)
  });
}

export async function postMessage(channelId: string, text:string, blocks: (KnownBlock | Block)[]) {
  const client = await createClient();
  await client.chat.postMessage({
    channel: channelId,
    text,
    blocks
  });
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
  trigger_id: string
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