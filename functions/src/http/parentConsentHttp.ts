import { BROWSER_SESSION_TTL_MS } from '../config/consentPolicy';
import { getBrowserSessionSecret } from '../config/secrets';
import {
  processConfirmation,
  processInitialConsent,
  revokeConsent,
} from '../consent/processInitialConsent';
import { buildConsentServiceDeps } from '../consent/serviceDeps';
import { applyExpiryIfNeeded } from '../consent/stateMachine';
import { hashToken } from '../consent/tokens';
import { ParentalConsentError } from '../domain/parentalConsent';
import {
  buildSessionPayload,
  clearSessionCookieHeader,
  CONSENT_SESSION_COOKIE,
  readCookie,
  sealBrowserSession,
  sessionCookieHeader,
  unsealBrowserSession,
  type BrowserSessionPurpose,
} from './browserSession';
import { clientIpFromRawRequest } from './errors';
import { layoutPage, noticeFormHtml, outcomeHtml } from './parentConsentPages';
import { applySecurityHeaders } from './securityHeaders';

/** Minimal request/response shapes used by Hosting-backed Functions. */
export interface ConsentHttpRequest {
  method?: string;
  path?: string;
  url?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  rawBody?: Buffer;
}

export interface ConsentHttpResponse {
  status: (code: number) => { send: (body: string) => void; setHeader?: (name: string, value: string) => void };
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  redirect: (code: number, url: string) => void;
}

type ExpressLikeReq = ConsentHttpRequest;
type ExpressLikeRes = ConsentHttpResponse;

function sendHtml(res: ExpressLikeRes, status: number, html: string): void {
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(status).send(html);
}

function parseBody(req: ExpressLikeReq): Record<string, string> {
  const body = req.body;
  if (body && typeof body === 'object') {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      out[k] = String(v ?? '');
    }
    return out;
  }
  return {};
}

export async function exchangeCapability(params: {
  req: ExpressLikeReq;
  res: ExpressLikeRes;
  purpose: BrowserSessionPurpose;
  tokenField: 'approvalTokenHash' | 'confirmationTokenHash' | 'revokeTokenHash';
  redirectPath: string;
}): Promise<void> {
  applySecurityHeaders(params.res);
  if (params.req.method !== 'GET') {
    params.res.status(405).send('Method not allowed');
    return;
  }

  const rawToken = String(params.req.query?.c ?? '');
  if (!rawToken) {
    sendHtml(
      params.res,
      400,
      layoutPage({
        title: 'Ignite — Invalid link',
        heading: 'Invalid link',
        bodyHtml: outcomeHtml('This link is invalid or incomplete.'),
      }),
    );
    return;
  }

  try {
    const deps = buildConsentServiceDeps();
    const tokenHash = hashToken(rawToken);
    const found = await deps.repository.findByTokenHash(
      params.tokenField,
      tokenHash,
    );
    if (!found) {
      sendHtml(
        params.res,
        403,
        layoutPage({
          title: 'Ignite — Invalid link',
          heading: 'Invalid link',
          bodyHtml: outcomeHtml('This link is invalid or has expired.'),
        }),
      );
      return;
    }

    const domain = deps.repository.toDomain(found);
    const now = new Date();
    const expiry = applyExpiryIfNeeded(domain, now);
    if (expiry.changed || domain.status === 'expired') {
      if (expiry.changed) {
        await deps.repository.updateFields(found.requestId, {
          status: 'expired',
        });
      }
      sendHtml(
        params.res,
        410,
        layoutPage({
          title: 'Ignite — Expired',
          heading: 'Request expired',
          bodyHtml: outcomeHtml('This consent request has expired.'),
        }),
      );
      return;
    }

    const sessionSecret = getBrowserSessionSecret();
    const payload = buildSessionPayload({
      purpose: params.purpose,
      requestId: found.requestId,
      capability: rawToken,
    });
    const sealed = sealBrowserSession(payload, sessionSecret);
    const maxAge = Math.floor(BROWSER_SESSION_TTL_MS / 1000);
    params.res.setHeader('Set-Cookie', sessionCookieHeader(sealed, maxAge));
    params.res.redirect(303, params.redirectPath);
  } catch {
    sendHtml(
      params.res,
      400,
      layoutPage({
        title: 'Ignite — Unable to continue',
        heading: 'Unable to continue',
        bodyHtml: outcomeHtml(
          'Something went wrong. Please try again from your email link.',
        ),
      }),
    );
  }
}

export async function renderActionPage(params: {
  req: ExpressLikeReq;
  res: ExpressLikeRes;
  purpose: BrowserSessionPurpose;
  heading: string;
  description: string;
  submitLabel: string;
  formAction: string;
}): Promise<void> {
  applySecurityHeaders(params.res);
  try {
    const sealed = readCookie(params.req.headers.cookie, CONSENT_SESSION_COOKIE);
    if (!sealed) {
      sendHtml(
        params.res,
        403,
        layoutPage({
          title: 'Ignite — Session required',
          heading: 'Session required',
          bodyHtml: outcomeHtml('Open the link from your email to continue.'),
        }),
      );
      return;
    }
    const session = unsealBrowserSession(sealed, getBrowserSessionSecret());
    if (session.purpose !== params.purpose) {
      sendHtml(
        params.res,
        403,
        layoutPage({
          title: 'Ignite — Invalid session',
          heading: 'Invalid session',
          bodyHtml: outcomeHtml('This session cannot perform that action.'),
        }),
      );
      return;
    }

    const deps = buildConsentServiceDeps();
    const raw = await deps.repository.requireRaw(session.requestId);
    const domain = deps.repository.toDomain(raw);

    sendHtml(
      params.res,
      200,
      layoutPage({
        title: `Ignite — ${params.heading}`,
        heading: params.heading,
        bodyHtml: noticeFormHtml({
          csrf: session.csrf,
          maskedParentEmail: domain.maskedParentEmail,
          expiresAt: domain.expiresAt.toISOString(),
          action: params.formAction,
          submitLabel: params.submitLabel,
          description: params.description,
        }),
      }),
    );
  } catch {
    sendHtml(
      params.res,
      403,
      layoutPage({
        title: 'Ignite — Unable to continue',
        heading: 'Unable to continue',
        bodyHtml: outcomeHtml(
          'This session is invalid or expired. Open the link from your email again.',
        ),
      }),
    );
  }
}

export async function handleActionPost(params: {
  req: ExpressLikeReq;
  res: ExpressLikeRes;
  purpose: BrowserSessionPurpose;
  action: 'initial' | 'confirm' | 'revoke';
  successHeading: string;
  successMessage: string;
}): Promise<void> {
  applySecurityHeaders(params.res);
  if (params.req.method !== 'POST') {
    params.res.status(405).send('Method not allowed');
    return;
  }

  try {
    const sealed = readCookie(params.req.headers.cookie, CONSENT_SESSION_COOKIE);
    if (!sealed) {
      throw new ParentalConsentError('invalid_token', 'Missing session.');
    }
    const session = unsealBrowserSession(sealed, getBrowserSessionSecret());
    if (session.purpose !== params.purpose) {
      throw new ParentalConsentError('invalid_token', 'Wrong session purpose.');
    }
    const body = parseBody(params.req);
    if (!body.csrf || body.csrf !== session.csrf) {
      throw new ParentalConsentError('permission_denied', 'Invalid CSRF token.');
    }

    const deps = buildConsentServiceDeps();
    const ip = clientIpFromRawRequest(params.req);
    let result: { requestId: string; status: string };
    if (params.action === 'initial') {
      result = await processInitialConsent(deps, session.capability, ip);
    } else if (params.action === 'confirm') {
      result = await processConfirmation(deps, session.capability, ip);
    } else {
      result = await revokeConsent(deps, session.capability, ip);
    }

    params.res.setHeader('Set-Cookie', clearSessionCookieHeader());
    sendHtml(
      params.res,
      200,
      layoutPage({
        title: `Ignite — ${params.successHeading}`,
        heading: params.successHeading,
        bodyHtml: outcomeHtml(
          `${params.successMessage} (status: ${result.status}).`,
        ),
      }),
    );
  } catch (error) {
    const message =
      error instanceof ParentalConsentError
        ? error.message
        : 'Unable to complete this action.';
    params.res.setHeader('Set-Cookie', clearSessionCookieHeader());
    sendHtml(
      params.res,
      400,
      layoutPage({
        title: 'Ignite — Action failed',
        heading: 'Action could not be completed',
        bodyHtml: outcomeHtml(message),
      }),
    );
  }
}

export async function parentConsentRouter(
  req: ExpressLikeReq,
  res: ExpressLikeRes,
): Promise<void> {
  const rawPath = req.path || (req.url ? req.url.split('?')[0] : '') || '/';
  const path = rawPath.replace(/\/$/, '') || '/';

  // Hosting may pass urlencoded form bodies as a raw string.
  if (typeof req.body === 'string' && req.body.length > 0) {
    const parsed: Record<string, string> = {};
    for (const pair of req.body.split('&')) {
      const [k, v] = pair.split('=');
      if (k) {
        parsed[decodeURIComponent(k)] = decodeURIComponent((v ?? '').replace(/\+/g, ' '));
      }
    }
    req.body = parsed;
  }

  if (path === '/parent-consent/start') {
    await exchangeCapability({
      req,
      res,
      purpose: 'approve',
      tokenField: 'approvalTokenHash',
      redirectPath: '/parent-consent',
    });
    return;
  }
  if (path === '/parent-consent/confirm/start') {
    await exchangeCapability({
      req,
      res,
      purpose: 'confirm',
      tokenField: 'confirmationTokenHash',
      redirectPath: '/parent-consent/confirm',
    });
    return;
  }
  if (path === '/parent-consent/revoke/start') {
    await exchangeCapability({
      req,
      res,
      purpose: 'revoke',
      tokenField: 'revokeTokenHash',
      redirectPath: '/parent-consent/revoke',
    });
    return;
  }

  if (path === '/parent-consent' && req.method === 'GET') {
    await renderActionPage({
      req,
      res,
      purpose: 'approve',
      heading: 'Review parental consent',
      description:
        'Please review this Ignite account request. Selecting the button below records your initial consent. A confirmation step may follow by email.',
      submitLabel: 'I am the parent/guardian and I consent',
      formAction: '/parent-consent',
    });
    return;
  }
  if (path === '/parent-consent' && req.method === 'POST') {
    await handleActionPost({
      req,
      res,
      purpose: 'approve',
      action: 'initial',
      successHeading: 'Consent recorded',
      successMessage:
        'Thank you. If confirmation is required, check your email for the next step',
    });
    return;
  }

  if (path === '/parent-consent/confirm' && req.method === 'GET') {
    await renderActionPage({
      req,
      res,
      purpose: 'confirm',
      heading: 'Confirm parental consent',
      description:
        'Please confirm your earlier consent. Selecting the button below marks consent as approved on Ignite’s servers.',
      submitLabel: 'Confirm my consent',
      formAction: '/parent-consent/confirm',
    });
    return;
  }
  if (path === '/parent-consent/confirm' && req.method === 'POST') {
    await handleActionPost({
      req,
      res,
      purpose: 'confirm',
      action: 'confirm',
      successHeading: 'Consent confirmed',
      successMessage: 'Parental consent is now approved',
    });
    return;
  }

  if (path === '/parent-consent/revoke' && req.method === 'GET') {
    await renderActionPage({
      req,
      res,
      purpose: 'revoke',
      heading: 'Revoke parental consent',
      description:
        'Selecting the button below revokes consent for this request when it is still revocable.',
      submitLabel: 'Revoke consent',
      formAction: '/parent-consent/revoke',
    });
    return;
  }
  if (path === '/parent-consent/revoke' && req.method === 'POST') {
    await handleActionPost({
      req,
      res,
      purpose: 'revoke',
      action: 'revoke',
      successHeading: 'Consent revoked',
      successMessage: 'This consent request has been revoked',
    });
    return;
  }

  sendHtml(
    res,
    404,
    layoutPage({
      title: 'Ignite — Not found',
      heading: 'Not found',
      bodyHtml: outcomeHtml('This page does not exist.'),
    }),
  );
}
