import appConfig from '../../../app.json';
import { getAppVersion } from '../../../src/features/profile/utils/getAppVersion';

describe('getAppVersion', () => {
  it('returns expo.version from app.json', () => {
    expect(getAppVersion()).toBe(appConfig.expo.version);
  });
});
