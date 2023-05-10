import { Key } from '@google-cloud/datastore';
import {createKey, datastore} from './tokenCommon';

export async function getToken(slackUserId: string) { 
  const key = createKey(slackUserId);

  // Datastore.get() returns a GetResponse which is really an array of any.
  // So cast it to the type we know it will be and just take the first element
  // of the array as we only expect one mapping.
  const getResponse = await datastore.get(key);
  interface Record {
    slack_id?: string;
    token?: string;
    key?: Key;
  }
  const record = (getResponse[0] && getResponse[0]) as Record;
  const token = record?.token;
  return token;
}