import appConfig from '../../../../app.json';

/**
 * Expo product version from the declared app config (`app.json` → `expo.version`).
 * Do not hardcode a parallel version string.
 */
export function getAppVersion(): string {
  return appConfig.expo.version;
}
