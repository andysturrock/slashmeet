export function generateGoogleMeetURLBlocks(meetingUrl: string) {
  const blocks = {
    response_type: 'in_channel',
    "blocks": [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Please join your meeting at ${meetingUrl}`
        }
      },
      {
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
      }
    ]
  };
  return blocks;
}
