import util from 'util';
import axios from 'axios';

export async function postToResponseUrl(response_url: string, messageBody: object) {
  const result = await axios.post(response_url, messageBody);
  if(result.status !== 200) {
    throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
  }
  return result;
}
