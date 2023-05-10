import { createKey, datastore } from './tokenCommon';

// TODO channelId and triggerId for future use for sending back response saying logged in.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveToken(token:string, slackUserId:string, /*channelId:string, triggerId:string*/) {

  const key = createKey(slackUserId);

  const record = {
    key: key,
    data: {
      token: token,
      slack_id: slackUserId
    }
  };
  await datastore.save(record);
}