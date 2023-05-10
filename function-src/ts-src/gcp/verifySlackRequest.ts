import functions = require('@google-cloud/functions-framework');
import { verifySlackRequest as _verifySlackRequest } from '@slack/bolt';
import { SlackRequestVerificationOptions } from '@slack/bolt/dist/receivers/verify-request';

export function verifySlackRequest(req: functions.Request) {
    // Verify that this request came from Slack
    const signingSecret = process.env.SLACK_SECRET;
    if(!signingSecret) {
      throw new Error("Missing env var SLACK_SECRET");
    }

    let x_slack_signature = req.headers['x-slack-signature'];
    if(!x_slack_signature) {
      throw new Error("Missing x-slack-signature header");
    }
    if(Array.isArray(x_slack_signature)) {
      x_slack_signature = x_slack_signature[0];
    }

    let x_slack_request_timestamp = req.headers['x-slack-request-timestamp'];
    if(!x_slack_request_timestamp) {
      throw new Error("Missing x-slack-request-timestamp header");
    }
    if(Array.isArray(x_slack_request_timestamp)) {
      x_slack_request_timestamp = x_slack_request_timestamp[0];
    }
    const number_x_slack_request_timestamp = parseInt(x_slack_request_timestamp);

    const rawBody = req.rawBody?.toLocaleString();
    if(!rawBody) {
      throw new Error("Cannot get raw body from request");
    }
    const slackRequestVerificationOptions: SlackRequestVerificationOptions = {
      signingSecret: signingSecret,
      body: rawBody,
      headers: {
          'x-slack-signature': x_slack_signature,
          'x-slack-request-timestamp': number_x_slack_request_timestamp
      }
    };

    // Throws an exception with details if invalid.
    _verifySlackRequest(slackRequestVerificationOptions);
  }
