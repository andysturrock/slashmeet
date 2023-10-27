export function generateImmediateSlackResponseBlocks() {
  const blocks = {
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Working on that...`
        }
      }
    ]
  };
  return blocks;
}
