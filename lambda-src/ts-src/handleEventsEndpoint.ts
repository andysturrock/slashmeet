import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";

/**
 * Handle the event posts from Slack.
 * @param event the event from Slack containing the event payload
 * @returns HTTP 200 back to Slack immediately to indicate the event payload has been received.
 */
export function handleEventsEndpoint(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }

    const result: APIGatewayProxyResult = {
      body: JSON.stringify({msg: "ok"}),
      statusCode: 200
    };

    type URLVerification = {
      token:string;
      challenge: string;
      type: string;
    };
    const urlVerification = JSON.parse(event.body) as URLVerification;
    if(urlVerification.type === "url_verification") {
      result.body = urlVerification.challenge;
      result.headers = {
        'Content-Type': 'text/plain',
      };
    }

    return result;
  }
  catch (error) {
    console.error(error);

    const json = {
      error: "Error - see logs for details"
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}
