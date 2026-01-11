/** @type {import('ts-jest').JestConfigWithTsJest} */
process.env.TZ = 'Etc/UTC';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/packages/.*/dist/', '/packages/.*/cdk.out/'],
  modulePathIgnorePatterns: ['<rootDir>/packages/cdk/dist', '<rootDir>/packages/lambda-src/dist'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
