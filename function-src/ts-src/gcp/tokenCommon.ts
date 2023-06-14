import {Datastore} from '@google-cloud/datastore';

// Creating this in global scope means GCP will cache it.
// This helps performance.
const datastore = new Datastore();
const kind = 'slackid_2_gcal_token';

function createKey(slackUserId: string) {
  const key = datastore.key([kind, slackUserId]);
  if(!key.name) {
    throw new Error(`Error creating key for slack_id ${slackUserId}.`);
  }
  return key;
}

export {datastore, kind, createKey};