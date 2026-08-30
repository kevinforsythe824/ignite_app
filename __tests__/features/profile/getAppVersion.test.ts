import appConfig from '../../../app.json';
import { getAppVersion } from '../../../src/shared/utils/getAppVersion';
import { getAppVersion as getAppVersionFromProfile } from '../../../src/features/profile/utils/getAppVersion';

describe('getAppVersion', () => {
  it('returns expo.version from app.json', () => {
    expect(getAppVersion()).toBe(appConfig.expo.version);
  });

  it('keeps the profile re-export', () => {
    expect(getAppVersionFromProfile()).toBe(getAppVersion());
  });
});
