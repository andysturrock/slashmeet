export function generateImmediateSlackResponseBlocks() {
  const blocks = {
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
