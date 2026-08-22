/**
 * Jest config for Firestore Security Rules unit tests.
 *
 * Intentionally does NOT use the jest-expo preset. That preset installs Expo's
 * winter/fetch polyfill, which replaces Node's global `fetch` with a stub that
 * is not an HTTP Response (no status/url). `@firebase/rules-unit-testing` needs
 * real Node fetch to talk to the Emulator Hub and load rules.
 *
 * Launch via: `npm run test:firestore-rules` (firebase emulators:exec).
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/firestore-rules/**/*.rules.test.ts'],
  testTimeout: 20000,
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
