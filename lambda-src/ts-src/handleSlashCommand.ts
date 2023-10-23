import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {generateImmediateSlackResponseBlocks} from './generateImmediateSlackResponseBlocks';
import querystring from 'querystring';
import util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from "./verifySlackRequest";
import {getSecretValue} from "./awsAPI";

async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const body = querystring.parse(event.body);

    const signingSecret = await getSecretValue('SlashMeet', 'slackSigningSecret');

    // Verify that this request really did come from Slack
    verifySlackRequest(signingSecret, event.headers, event.body);

    // We need to send an immediate response within 3000ms.
    // So this lambda will invoke another one to do the real work.
    // It will use the response_url which comes from the body of the event param.
    // Here we just return an interim result with a 200 code.
    // See https://api.slack.com/interactivity/handling#acknowledgment_response

    const blocks = generateImmediateSlackResponseBlocks();
    const result: APIGatewayProxyResult = {
      body: JSON.stringify(blocks),
      statusCode: 200
    };

    const configuration: LambdaClientConfig = {
      region: 'eu-west-2'
    };

    const lambdaClient = new LambdaClient(configuration);
    const input: InvokeCommandInput = {
      FunctionName: 'SlashMeet-handleMeetCommandLambda',
      InvocationType: InvocationType.Event,
      Payload: new TextEncoder().encode(JSON.stringify(body))
    };

    const command = new InvokeCommand(input);
    const output = await lambdaClient.send(command);
    if(output.StatusCode != 202) {
      throw new Error(`Failed to invoke SlashMeet-handleMeetCommandLambda - error:${util.inspect(output.FunctionError)}`);
    }

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
    const blocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Error: ${util.inspect(error)}`
          }
        }
      ]
    };
    const result: APIGatewayProxyResult = {
      body: JSON.stringify(blocks),
      statusCode: 200
    };
    return result;
  }
}

export {lambdaHandler};
