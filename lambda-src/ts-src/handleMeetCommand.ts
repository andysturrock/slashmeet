import {ChannelMember, getChannelMembers, getSlackUserTimeZone, openView, postErrorMessageToResponseUrl, SlashCommandPayload} from './slackAPI';
import {MeetingOptions, parseMeetingArgs} from './parseMeetingArgs';
import {InputBlock, KnownBlock, ModalView, Option} from '@slack/bolt';

export async function handleMeetCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;
  try {

    let timeZone = "Etc/UTC";
    try {
      timeZone = await getSlackUserTimeZone(event.user_id);
    } catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "Error getting user's timezone.");
      return;
    }

    // Give a default name for the meeting if not provided.
    const meetingArgs = event.text.length == 0 ? '/meet' : event.text;
    const now = new Date();
    let meetingOptions: MeetingOptions;
    try {
      meetingOptions = parseMeetingArgs(meetingArgs, now, timeZone);
    } catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "Error parsing meeting options.");
      return;
    }

    let channelMembers: ChannelMember[] = [];
    try {
      channelMembers = await getChannelMembers(event.channel_id);
    }
    catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "I need to be a member of a private channel or DM to list the members.");
    }
    const blocks = createModalBlocks(meetingOptions, channelMembers);
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
      private_metadata: JSON.stringify({channelId: event.channel_id, now: meetingOptions.now}),
      callback_id: "SlashMeetModal"
    };
    await openView(event.trigger_id, modalView);
  }
  catch (error) {
    console.error(error);
    await postErrorMessageToResponseUrl(responseUrl, "Failed to create GMeet meeting");
  }
}


function createModalBlocks(meetingOptions: MeetingOptions, channelMembers: ChannelMember[]) {
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

  inputBlock = {
    type: "input",
    block_id: "participants",
    label: {
      type: "plain_text",
      text: "Participants"
    },
    element: {
      type: "multi_users_select",
      action_id: "participants_text",
      placeholder: {
        type: "plain_text",
        text: "Participant names"
      },
      initial_users: channelMembers.map((member) => {return member.slackId;}),
    },
    optional: false
  };
  blocks.push(inputBlock);

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

  const options: Option[] = [
    {
      text: {
        type: "plain_text",
        text: "Create meeting request in Outlook",
        emoji: true
      },
      value: "cal"
    },
  ];
  const initial_options = meetingOptions.noCal? undefined : options;
  inputBlock = {
    type: "input",
    block_id: "nocal",
    element: {
      type: "checkboxes",
      action_id: "nocal",
      initial_options,
      options
    },
    "label": {
      "type": "plain_text",
      "text": "Create Outlook meeting?",
      "emoji": true
    }
  };
  blocks.push(inputBlock);

  return blocks;
}