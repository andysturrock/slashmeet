import { ActionsBlock, SectionBlock } from "@slack/web-api";

export function generateGoogleMeetURLBlocks(meetingUrl: string, meetingName: string) {
  const sectionBlock: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Please join the "${meetingName}" meeting at ${meetingUrl}`
    }
  };
  const actionsBlock: ActionsBlock = {
    type: "actions",
    block_id: "joinMeetingButton",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Join Meeting"
        },
        url: meetingUrl,
        style: "primary",
        action_id: 'joinMeetingButton'
      }
    ]
  };
  return [sectionBlock, actionsBlock];
}
