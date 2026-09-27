/**
 * Jest config for the nested curriculum repository emulator test.
 *
 * Node-only, like the Firestore rules harness. Launch via
 * `npm run test:curriculum-repository-emulator`. The default `npm test`
 * run does not start an emulator. This project id is emulator-only.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/curriculum-repository-emulator/**/*.emulator.test.ts'],
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
