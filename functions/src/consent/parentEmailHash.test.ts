import { createHash } from 'crypto';

import { setParentEmailHmacSecretForTests } from '../config/secrets';
import { hashParentEmailForAbuseKey } from './parentEmailHash';

describe('parent email HMAC hash', () => {
  afterEach(() => {
    setParentEmailHmacSecretForTests(undefined);
  });

  it('requires a secret', () => {
    setParentEmailHmacSecretForTests(undefined);
    delete process.env.PARENT_EMAIL_HMAC_SECRET;
    expect(() => hashParentEmailForAbuseKey('parent@example.com')).toThrow(
      /PARENT_EMAIL_HMAC_SECRET/,
    );
  });

  it('is stable for the same email and secret', () => {
    const secret = 'test-hmac-secret-value';
    const a = hashParentEmailForAbuseKey('Parent@Example.com', secret);
    const b = hashParentEmailForAbuseKey('parent@example.com', secret);
    expect(a).toBe(b);
  });

  it('is not unsalted SHA-256 of the email', () => {
    const secret = 'test-hmac-secret-value';
    const hashed = hashParentEmailForAbuseKey('parent@example.com', secret);
    const unsalted = createHash('sha256')
      .update('parent@example.com', 'utf8')
      .digest('hex');
    expect(hashed).not.toBe(unsalted);
  });
});
