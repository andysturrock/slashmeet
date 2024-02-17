import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {generateImmediateSlackResponseBlocks} from './generateImmediateSlackResponseBlocks';
import querystring from 'querystring';
import util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {verifySlackRequest} from "./verifySlackRequest";
import {getSecretValue} from "./awsAPI";
import {SlashCommandPayload} from "./slackAPI";
import {MeetingOptions, parseMeetingArgs} from "./parseMeetingArgs";
import {getGCalToken} from "./tokenStorage";

export async function handleSlashCommand(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const body = querystring.parse(event.body) as unknown as SlashCommandPayload;

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

    // Dispatch to the appropriate lambda depending on meeting args
    // and whether we are logged into AAD/Entra and Google
    let functionName = "SlashMeet-handleMeetCommandLambda";
    
    let meetingOptions: MeetingOptions;
    try {
      const meetingArgs = body.text.length == 0 ? '/meet' : body.text;
      meetingOptions = parseMeetingArgs(meetingArgs, new Date());
    } catch (error) {
      console.error(error);
      return createErrorResult("Usage: /meet ([name] [start|now] [end|duration] [nocal]) | [login] | [logout]");
    }
    // const aadRefreshToken = await getAADToken(body.user_id);
    const gcalRefreshToken = await getGCalToken(body.user_id);
    // TODO for now make logging into AAD optional
    // if(!aadRefreshToken || !gcalRefreshToken) {
    if(!gcalRefreshToken || meetingOptions.login) {
      functionName = "SlashMeet-handleLoginCommandLambda";
    }
    else if(meetingOptions.logout) {
      functionName = "SlashMeet-handleLogoutCommandLambda";
    }

    const configuration: LambdaClientConfig = {
      region: 'eu-west-2'
    };

    const lambdaClient = new LambdaClient(configuration);
    const input: InvokeCommandInput = {
      FunctionName: functionName,
      InvocationType: InvocationType.Event,
      Payload: new TextEncoder().encode(JSON.stringify(body))
    };

    const command = new InvokeCommand(input);
    const output = await lambdaClient.send(command);
    if(output.StatusCode != 202) {
      throw new Error(`Failed to invoke ${functionName} - error:${util.inspect(output.FunctionError)}`);
    }

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
    return createErrorResult("There was an error.  Please contact support.");
  }
}

function createErrorResult(text: string) {
  const blocks = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text
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