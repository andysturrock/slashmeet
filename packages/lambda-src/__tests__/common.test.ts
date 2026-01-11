import { PrivateMetaData } from '../ts-src/common';

describe('common types', () => {
  test('PrivateMetaData should be dummy test for types', () => {
    const data: PrivateMetaData = {
      channelId: 'C123',
      now: true,
      startDate: new Date()
    };
    expect(data.channelId).toBe('C123');
  });
});
