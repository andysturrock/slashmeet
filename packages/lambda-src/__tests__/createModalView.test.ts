import { createModalView } from '../ts-src/createModalView';
import { MeetingOptions } from '../ts-src/parseMeetingArgs';

describe('createModalView', () => {
  const meetingOptions: MeetingOptions = {
    name: 'Test Meeting',
    startDate: new Date(),
    endDate: new Date(),
    now: true,
    noCal: false,
    login: false,
    logout: false
  };

  test('createModalView should return a modal view with blocks', () => {
    const modalView = createModalView(meetingOptions, 'C123', [], true);
    expect(modalView.type).toBe('modal');
    expect(modalView.blocks.length).toBeGreaterThan(0);
    expect(modalView.callback_id).toBe('SlashMeetModal');
  });

  test('createModalView should handle null channelMembers', () => {
    const modalView = createModalView(meetingOptions, 'C123', null, true);
    const hasGettingMembers = modalView.blocks.some(b =>
      b.type === 'section' && (b as any).fields && (b as any).fields[0].text === 'Getting channel members...'
    );
    expect(hasGettingMembers).toBe(true);
  });

  test('createModalView should handle MS login status', () => {
    const modalViewLoggedOut = createModalView(meetingOptions, 'C123', [], false);
    const hasLoginPrompt = modalViewLoggedOut.blocks.some(b =>
      b.type === 'section' && (b as any).fields && (b as any).fields[0].text.includes('not logged into Microsoft')
    );
    expect(hasLoginPrompt).toBe(true);
  });
});
