import { generateGoogleMeetURLBlocks } from '../ts-src/generateGoogleMeetURLBlocks';
import { generateLoggedInHTML } from '../ts-src/generateLoggedInHTML';

describe('UI and Block Generation', () => {
  test('generateGoogleMeetURLBlocks should return section and actions blocks', () => {
    const blocks = generateGoogleMeetURLBlocks('http://meet.url', 'Test Meeting');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('section');
    expect(blocks[1].type).toBe('actions');
  });

  test('generateLoggedInHTML should return HTML with provider name', () => {
    const html = generateLoggedInHTML('Google');
    expect(html).toContain('Authentication Success');
    expect(html).toContain('authenticated with Google');
  });
});
