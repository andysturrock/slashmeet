export function generateGoogleMeetURLBlocks(meetingUrl: string) {
  const blocks = {
    response_type: 'in_channel',
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Please join your meeting at ${meetingUrl}`
        }
      }
    ]
  };
  return blocks;
}
