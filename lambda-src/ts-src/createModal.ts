import { InputBlock, KnownBlock, ModalView, Option, SectionBlock } from "@slack/bolt";
import { PrivateMetaData } from "./common";
import { MeetingOptions } from "./parseMeetingArgs";
import { ChannelMember } from "./slackAPI";

export function createModalView(meetingOptions: MeetingOptions,
  channelId: string,
  channelMembers: ChannelMember[] | null,
  isLoggedIntoAad: boolean | null) {

  const privateMetadata: PrivateMetaData = {
    channelId,
    ...meetingOptions
  };
  const blocks = createModalBlocks(meetingOptions, channelMembers, isLoggedIntoAad);
  const modalView: ModalView = {
    type: "modal",
    title: {
      type: "plain_text",
      text: "/meet"
    },
    blocks,
    close: {
      type: "plain_text",
      text: "Cancel"
    },
    submit: {
      type: "plain_text",
      text: "Create Meeting"
    },
    private_metadata: JSON.stringify(privateMetadata),
    callback_id: "SlashMeetModal"
  };
  return modalView;
}

function createModalBlocks(meetingOptions: MeetingOptions, channelMembers: ChannelMember[] | null, isLoggedIntoAad: boolean | null) {
  const blocks: KnownBlock[] = [];
  let inputBlock: InputBlock = {
    type: "input",
    block_id: "title",
    label: {
      type: "plain_text",
      text: "Title"
    },
    element: {
      type: "plain_text_input",
      action_id: "title",
      placeholder: {
        type: "plain_text",
        text: "Meeting name"
      },
      initial_value: meetingOptions.name,
      multiline: false
    },
    optional: false
  };
  blocks.push(inputBlock);

  if(channelMembers != null) {
    inputBlock = {
      type: "input",
      block_id: "attendees",
      label: {
        type: "plain_text",
        text: "Meeting Attendees"
      },
      element: {
        type: "multi_users_select",
        action_id: "attendees",
        placeholder: {
          type: "plain_text",
          text: "Meeting Attendees"
        },
        initial_users: channelMembers.map((member) => {return member.slackId;}),
      },
      optional: false
    };
    blocks.push(inputBlock);
  }
  else {
    const sectionBlock: SectionBlock = {
      type: "section",
      fields: [
        {
          type: "plain_text",
          text: "Getting channel members..."
        }
      ]
    };
    blocks.push(sectionBlock);
  }

  inputBlock = {
    type: "input",
    block_id: "meeting_start",
    element: {
      type: 'datetimepicker',
      action_id: "meeting_start",
      initial_date_time: meetingOptions.startDate.getTime() / 1000 // Slack wants this in seconds not ms
    },
    label: {
      type: 'plain_text',
      text: 'Meeting start',
    },
    hint: {
      type: 'plain_text',
      text: 'Meeting start date and time',
    },
  };
  blocks.push(inputBlock);

  inputBlock = {
    type: "input",
    block_id: "meeting_end",
    element: {
      type: 'datetimepicker',
      action_id: "meeting_end",
      initial_date_time: meetingOptions.endDate.getTime() / 1000 // Slack wants this in seconds not ms
    },
    label: {
      type: 'plain_text',
      text: 'Meeting end',
    },
    hint: {
      type: 'plain_text',
      text: 'Meeting end date and time',
    },
  };
  blocks.push(inputBlock);

  if(isLoggedIntoAad != null && isLoggedIntoAad) {
    const options: Option[] = [
      {
        text: {
          type: "plain_text",
          text: "Yes",
          emoji: true
        },
        value: "cal"
      },
      {
        text: {
          type: "plain_text",
          text: "No",
          emoji: true
        },
        value: "nocal"
      },
    ];
    const initial_option = meetingOptions.noCal? options[1] : options[0];
    inputBlock = {
      type: "input",
      block_id: "nocal",
      element: {
        type: "radio_buttons",
        action_id: "nocal",
        initial_option,
        options
      },
      "label": {
        "type": "plain_text",
        "text": "Create Outlook meeting?",
        "emoji": true
      }
    };
    blocks.push(inputBlock);
  }
  if(isLoggedIntoAad != null && !isLoggedIntoAad) {
    const sectionBlock: SectionBlock = {
      type: "section",
      fields: [
        {
          type: "plain_text",
          text: "Cannot create Outlook meeting as not logged into Microsoft.  Use /meet login."
        }
      ]
    };
    blocks.push(sectionBlock);
  }

  return blocks;
}