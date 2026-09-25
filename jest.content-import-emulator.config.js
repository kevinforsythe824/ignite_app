/**
 * Jest config for the content-import Firestore emulator harness.
 *
 * Intentionally does NOT use the jest-expo preset. Launch only via
 * `npm run test:content-import-emulator` so the default unit run does not
 * need Java or a Firestore emulator.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/content-import-emulator/**/*.emulator.test.ts'],
  testTimeout: 120000,
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [require.resolve('@babel/preset-typescript')],
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
      },
    ],
  },
};
