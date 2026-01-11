import crypto from 'crypto';
import { generateAADAuthBlocks } from '../ts-src/generateAADAuthBlocks';
import { generateGoogleAuthBlocks } from '../ts-src/generateGoogleAuthBlocks';
import { putState } from '../ts-src/stateTable';

jest.mock('../ts-src/stateTable');

describe('Auth Blocks Generation', () => {
  const mockPutState = putState as jest.MockedFunction<typeof putState>;

  beforeEach(() => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue({ toString: jest.fn().mockReturnValue('mock-nonce') } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('generateAADAuthBlocks should call putState and return blocks', async () => {
    const confidentialClientApplication = {
      getAuthCodeUrl: jest.fn().mockResolvedValue('http://mock-url'),
    } as any;

    const blocks = await generateAADAuthBlocks(confidentialClientApplication, 'http://redirect', 'U123', 'http://response');
    expect(mockPutState).toHaveBeenCalled();
    expect(blocks).toHaveLength(2);
    expect(blocks[1].type).toBe('actions');
  });

  test('generateGoogleAuthBlocks should call putState and return blocks', async () => {
    const oauth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('http://mock-url'),
    } as any;

    const blocks = await generateGoogleAuthBlocks(oauth2Client, 'U123', 'http://response');
    expect(mockPutState).toHaveBeenCalled();
    expect(blocks).toHaveLength(2);
    expect(blocks[1].type).toBe('actions');
  });
});
