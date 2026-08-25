import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';

import { appCheckCallableOptions } from './config/appCheck';
import {
  assertProjectMatchesEnvironment,
  readIgniteEnvironment,
  resolveActiveProjectId,
} from './config/environment';
import { claimParentalConsent } from './consent/claimConsent';
import { sendScheduledConfirmationEmail } from './consent/confirmationTask';
import { createParentalConsentRequest } from './consent/createRequest';
import { getParentalConsentStatus } from './consent/getStatus';
import { resendParentalConsentNotice } from './consent/resendNotice';
import { buildConsentServiceDeps } from './consent/serviceDeps';
import { updateParentalConsentEmail } from './consent/updateEmail';
import { parentConsentRouter } from './http/parentConsentHttp';
import { clientIpFromRawRequest, toHttpsError } from './http/errors';
import { layoutPage, outcomeHtml } from './http/parentConsentPages';
import { applySecurityHeaders } from './http/securityHeaders';

function guardEnvironment(): void {
  const env = readIgniteEnvironment();
  assertProjectMatchesEnvironment(env, resolveActiveProjectId());
}

const callableOpts = {
  ...appCheckCallableOptions(),
};

export const createParentalConsentRequestFn = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const parentEmail = String(request.data?.parentEmail ?? '');
      const deps = buildConsentServiceDeps();
      return await createParentalConsentRequest(deps, {
        parentEmail,
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const getParentalConsentStatusFn = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps();
      return await getParentalConsentStatus(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const resendParentalConsentNoticeFn = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps();
      return await resendParentalConsentNotice(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const updateParentalConsentEmailFn = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps();
      return await updateParentalConsentEmail(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
        parentEmail: String(request.data?.parentEmail ?? ''),
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const claimParentalConsentFn = onCall(callableOpts, async (request) => {
  try {
    guardEnvironment();
    if (!request.auth?.uid) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication is required to claim parental consent.',
      );
    }
    const deps = buildConsentServiceDeps();
    return await claimParentalConsent(deps, {
      requestId: String(request.data?.requestId ?? ''),
      clientSessionToken: String(request.data?.clientSessionToken ?? ''),
      authenticatedUid: request.auth.uid,
    });
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Hosting rewrite target for all /parent-consent* routes.
 * GET never mutates consent; POST requires sealed session + CSRF.
 */
export const parentalConsentHosting = onRequest(
  { cors: false },
  async (req, res) => {
    try {
      guardEnvironment();
      await parentConsentRouter(
        req as unknown as import('./http/parentConsentHttp').ConsentHttpRequest,
        res as unknown as import('./http/parentConsentHttp').ConsentHttpResponse,
      );
    } catch {
      applySecurityHeaders(res);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(
        layoutPage({
          title: 'Ignite — Error',
          heading: 'Something went wrong',
          bodyHtml: outcomeHtml('Please try again later.'),
        }),
      );
    }
  },
);

/** Delayed confirmation email — Task Queue Function (Cloud Tasks). */
export const sendParentalConsentConfirmationTask = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 5,
      minBackoffSeconds: 60,
    },
    rateLimits: {
      maxConcurrentDispatches: 6,
    },
  },
  async (req) => {
    guardEnvironment();
    const requestId = String(req.data?.requestId ?? '');
    const confirmationDeliveryVersion = Number(
      req.data?.confirmationDeliveryVersion ?? 0,
    );
    if (!requestId || !confirmationDeliveryVersion) {
      return;
    }
    const deps = buildConsentServiceDeps();
    await sendScheduledConfirmationEmail(deps, {
      requestId,
      confirmationDeliveryVersion,
    });
  },
);

// Public callable names matching the Phase 6.5A plan.
export {
  createParentalConsentRequestFn as createParentalConsentRequest,
  getParentalConsentStatusFn as getParentalConsentStatus,
  resendParentalConsentNoticeFn as resendParentalConsentNotice,
  updateParentalConsentEmailFn as updateParentalConsentEmail,
  claimParentalConsentFn as claimParentalConsent,
};

// Intentionally NOT exported: processInitialConsentHttp / processConfirmationHttp /
// revokeConsentHttp — raw-token mutation bypasses removed in Phase 6.5B (ADR-009).
