/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/integration/**/*.integration.test.ts'],
  testTimeout: 60000,
  clearMocks: true,
  forceExit: true,
};
