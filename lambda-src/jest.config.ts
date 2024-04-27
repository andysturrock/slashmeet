import type {JestConfigWithTsJest} from 'ts-jest';

// The tests contain some timezone stuff, so fix the timezone for their execution to UTC.
process.env.TZ = 'Etc/UTC';

const jestConfig: JestConfigWithTsJest = {
  // [...]
  // Replace `ts-jest` with the preset you want to use
  // from the above list
  preset: 'ts-jest',
  testEnvironment: 'node',
};

export default jestConfig;