import {WebClient, LogLevel} from "@slack/web-api";
import {getSecretValue} from './awsAPI';


export async function getSlackUserTimeZone(userId: string) {
  const slackBotToken = await getSecretValue('SlashMeet', 'slackBotToken');

  const client = new WebClient(slackBotToken, {
    logLevel: LogLevel.INFO
  });
  const result = await client.users.info({
    user: userId
  });
  if(!result.user?.tz) {
    throw new Error("Cannot get timezone from user object");
  }
  return result.user.tz;
}
