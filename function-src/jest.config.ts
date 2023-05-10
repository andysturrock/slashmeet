// /** @type {import('ts-jest').JestConfigWithTsJest} */
// // eslint-disable-next-line no-undef
// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'node',
// };


import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  // [...]
  // Replace `ts-jest` with the preset you want to use
  // from the above list
  preset: 'ts-jest',
  testEnvironment: 'node',
}

export default jestConfig