import { createModalView } from './createModalView';
import { MeetingOptions, parseMeetingArgs } from './parseMeetingArgs';
import { ChannelMember, getChannelMembers, getSlackUserTimeZone, postErrorMessageToResponseUrl, SlashCommandPayload, updateView } from './slackAPI';
import { getAADToken } from './tokenStorage';

export async function handleMeetCommand(event: SlashCommandPayload): Promise<void> {
  const responseUrl = event.response_url;
  try {
    if(!event.view_id) {
      throw new Error("Missing view_id in event");
    }
    if(!event.view_hash) {
      throw new Error("Missing view_hash in event");
    }

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
    // Check if the user is logged into AAD.
    // If not then we won't enable the option to create the Outlook meeting.
    const isLoggedIntoAad = await getAADToken(event.user_id) != undefined;
    // Don't populate the attendees yet
    let modalView = createModalView(meetingOptions, event.channel_id, null, isLoggedIntoAad);
    let viewsUpdateResponse = await updateView(event.view_id, event.view_hash, modalView);
    // Populate the meeting attendees with the channel members.
    // We can only get members of private channels/DMs where we are a member.
    // In public channels we can get the list whether we are a member or not.
    let channelMembers: ChannelMember[] = [];
    try {
      channelMembers = await getChannelMembers(event.channel_id);
    }
    catch (error) {
      console.error(error);
      await postErrorMessageToResponseUrl(responseUrl, "I need to be a member of a private channel or DM to list the members.");
    }
    if(!viewsUpdateResponse.view?.id) {
      throw new Error("Missing view id in view update response");
    }
    if(!viewsUpdateResponse.view.hash) {
      throw new Error("Missing view hash in view update response");
    }
    modalView = createModalView(meetingOptions, event.channel_id, channelMembers, isLoggedIntoAad);
    viewsUpdateResponse = await updateView(viewsUpdateResponse.view.id, viewsUpdateResponse.view.hash, modalView);
  }
  catch (error) {
    console.error(error);
    await postErrorMessageToResponseUrl(responseUrl, "Failed to create GMeet meeting");
  }
}
