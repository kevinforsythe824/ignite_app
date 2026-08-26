import {
  setBrowserSessionSecretForTests,
  setConsentSealSecretForTests,
  setParentEmailHmacSecretForTests,
} from '../config/secrets';
import { createParentalConsentRequest } from '../consent/createRequest';
import { getParentalConsentStatus } from '../consent/getStatus';
import { RecordingConfirmationScheduler } from '../consent/confirmationTask';
import { MemoryConsentRepository } from '../consent/memoryRepository';
import { setConsentServiceDepsForTests } from '../consent/serviceDeps';
import { SharedMapRateLimiter } from '../consent/sharedMapRateLimiter';
import { ConsoleEmailSender } from '../email/consoleEmailSender';
import { CompositeEmailSender, TestEmailCapture } from '../email/testEmailCapture';
import {
  parentConsentRouter,
  type ConsentHttpRequest,
  type ConsentHttpResponse,
} from './parentConsentHttp';

const HMAC = 'unit-test-hmac-secret';
const SEAL = 'unit-test-seal-secret-value';
const SESSION = 'unit-test-browser-session-secret';

function mockRes(): ConsentHttpResponse & {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  location?: string;
} {
  const headers: Record<string, string> = {};
  const box = {
    statusCode: 200,
    body: '',
    headers,
    location: undefined as string | undefined,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      box.statusCode = code;
      return {
        send(body: string) {
          box.body = body;
        },
      };
    },
    send(body: string) {
      box.body = body;
    },
    redirect(code: number, url: string) {
      box.statusCode = code;
      box.location = url;
    },
  };
  return box;
}

describe('parentConsentRouter session handoff', () => {
  afterEach(() => {
    setConsentServiceDepsForTests(undefined);
    setParentEmailHmacSecretForTests(undefined);
    setConsentSealSecretForTests(undefined);
    setBrowserSessionSecretForTests(undefined);
  });

  it('GET /start sets __session and 303s without mutating consent', async () => {
    process.env.IGNITE_ENV = 'dev';
    setParentEmailHmacSecretForTests(HMAC);
    setConsentSealSecretForTests(SEAL);
    setBrowserSessionSecretForTests(SESSION);

    const repo = new MemoryConsentRepository();
    const capture = new TestEmailCapture();
    const deps = {
      repository: repo,
      rateLimiter: new SharedMapRateLimiter(new Map()),
      emailSender: new CompositeEmailSender(
        new ConsoleEmailSender(() => undefined),
        capture,
      ),
      environment: 'dev' as const,
      hmacSecret: HMAC,
      sealSecret: SEAL,
      confirmationScheduler: new RecordingConfirmationScheduler(),
    };
    setConsentServiceDepsForTests(deps);

    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'parent@example.com',
    });
    const token = capture.latestNotice()?.approvalToken;
    expect(token).toBeTruthy();

    const startRes = mockRes();
    const startReq: ConsentHttpRequest = {
      method: 'GET',
      path: '/parent-consent/start',
      url: `/parent-consent/start?c=${encodeURIComponent(token ?? '')}`,
      query: { c: token },
      headers: {},
    };
    await parentConsentRouter(startReq, startRes);

    expect(startRes.statusCode).toBe(303);
    expect(startRes.location).toBe('/parent-consent');
    const cookie = startRes.headers['set-cookie'] ?? '';
    expect(cookie.startsWith('__session=')).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('SameSite=Strict');
    expect(cookie).not.toContain('ignite_consent_session');

    const status = await getParentalConsentStatus(deps, {
      requestId: created.requestId,
      clientSessionToken: created.clientSessionToken,
    });
    expect(status.status).toBe('pending');
  });

  it('GET /parent-consent without __session is Session required and does not approve', async () => {
    const res = mockRes();
    await parentConsentRouter(
      {
        method: 'GET',
        path: '/parent-consent',
        url: '/parent-consent',
        headers: {},
      },
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Session required');
  });
});
