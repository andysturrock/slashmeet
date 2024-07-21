import { InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig } from "@aws-sdk/client-lambda";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import querystring from 'querystring';
import util from 'util';
import { getSecretValue } from "./awsAPI";
import { createModalView } from "./createModal";
import { MeetingOptions, parseMeetingArgs } from "./parseMeetingArgs";
import { openView, SlashCommandPayload } from "./slackAPI";
import { getGCalToken } from "./tokenStorage";
import { verifySlackRequest } from "./verifySlackRequest";

// Cache this between invocations in the same execution environment.
// See https://docs.aws.amazon.com/lambda/latest/operatorguide/global-scope.html
let slackSigningSecret = "";

export async function handleSlashCommand(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const body = querystring.parse(event.body) as unknown as SlashCommandPayload;

    if(slackSigningSecret == "") {
      // Debug statements so can see how long this takes.
      // Sometimes SecretsManager calls take over a second.
      console.debug("slackSigningSecret is not cached so fetching...");
      slackSigningSecret = await getSecretValue('SlashMeet', 'slackSigningSecret');
      console.debug("Done fetching slackSigningSecret.");
    }
    // Verify that this request really did come from Slack
    verifySlackRequest(slackSigningSecret, event.headers, event.body);

    // We need to send an immediate response within 3000ms.
    // So this lambda will invoke another one to do the real work.
    // It will use the response_url which comes from the body of the event param.
    // Here we just return an interim result with a 200 code.
    // See https://api.slack.com/interactivity/handling#acknowledgment_response
    const result: APIGatewayProxyResult = {
      body: "",
      statusCode: 200
    };
    
    let meetingOptions: MeetingOptions;
    try {
      const meetingArgs = body.text.length == 0 ? '/meet' : body.text;
      meetingOptions = parseMeetingArgs(meetingArgs, new Date(), "Etc/UTC");
    } catch (error) {
      console.error(error);
      return createErrorResult("Usage: /meet ([meeting title] [start|now] [end|duration] [nocal]) | [login] | [logout]");
    }

    const gcalRefreshToken = await getGCalToken(body.user_id);
    // Dispatch to the appropriate lambda depending on the command given by the user.
    let functionName = "SlashMeet-handleMeetCommandLambda";
    // Run the login lambda if the user is not logged into Google.
    if(!gcalRefreshToken || meetingOptions.login) {
      functionName = "SlashMeet-handleLoginCommandLambda";
    }
    else if(meetingOptions.logout) {
      functionName = "SlashMeet-handleLogoutCommandLambda";
      result.body = "Logging out...";
    }
    else {
      const modalView = createModalView(meetingOptions, body.channel_id, null, null);
      const viewsOpenResponse = await openView(body.trigger_id, modalView);
      body.view_id = viewsOpenResponse.view?.id;
      body.view_hash = viewsOpenResponse.view?.hash;
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
    console.error(error);
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
