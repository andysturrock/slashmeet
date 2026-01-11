import { jest } from '@jest/globals';

// Silence console methods during tests to keep output clean.
// Spying on them allows tests to still assert that they were called.
jest.spyOn(console, 'log').mockImplementation(() => { });
jest.spyOn(console, 'error').mockImplementation(() => { });
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(console, 'info').mockImplementation(() => { });
jest.spyOn(console, 'debug').mockImplementation(() => { });
