import { collectSafeClientMetadata } from '../../../src/features/feedback/utils/collectSafeClientMetadata';

describe('collectSafeClientMetadata', () => {
  it('records tablet only when iOS reports isPad', () => {
    expect(
      collectSafeClientMetadata(() => '1.0.0', { OS: 'ios', Version: '17.4', isPad: true }),
    ).toEqual({
      appVersion: '1.0.0',
      platform: 'ios',
      osVersion: '17.4',
      deviceType: 'tablet',
    });
  });

  it('uses mobile for iPhone and for Android without guessing phone vs tablet', () => {
    expect(
      collectSafeClientMetadata(() => '1.0.0', { OS: 'ios', Version: 17, isPad: false }),
    ).toMatchObject({ platform: 'ios', deviceType: 'mobile' });
    expect(
      collectSafeClientMetadata(() => '1.0.0', { OS: 'android', Version: 34 }),
    ).toMatchObject({ platform: 'android', deviceType: 'mobile' });
  });

  it('uses web / unknown without inventing a phone class', () => {
    expect(
      collectSafeClientMetadata(() => '1.0.0', { OS: 'web', Version: 'n/a' }),
    ).toMatchObject({ platform: 'web', deviceType: 'web' });
    expect(
      collectSafeClientMetadata(() => '1.0.0', { OS: 'macos', Version: '15' }),
    ).toMatchObject({ platform: 'unknown', deviceType: 'unknown' });
  });

  it('never attaches profile, consent, email, or UID fields', () => {
    const metadata = collectSafeClientMetadata(() => '1.0.0', {
      OS: 'ios',
      Version: '17.0',
    });
    const keys = Object.keys(metadata).sort();
    expect(keys).toEqual(['appVersion', 'deviceType', 'osVersion', 'platform']);
    expect(metadata).not.toHaveProperty('uid');
    expect(metadata).not.toHaveProperty('actorUid');
    expect(metadata).not.toHaveProperty('userId');
    expect(metadata).not.toHaveProperty('firstName');
    expect(metadata).not.toHaveProperty('lastName');
    expect(metadata).not.toHaveProperty('email');
    expect(metadata).not.toHaveProperty('parentEmail');
    expect(metadata).not.toHaveProperty('consent');
    expect(metadata).not.toHaveProperty('capability');
    expect(JSON.stringify(metadata)).not.toMatch(/quizzer|consent|@/i);
  });
});
