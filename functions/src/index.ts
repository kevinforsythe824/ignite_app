import { ensureFirebaseAdminInitialized } from './config/adminInit';

ensureFirebaseAdminInitialized();

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';

import { appCheckCallableOptions } from './config/appCheck';
import {
  assertProjectMatchesEnvironment,
  readIgniteEnvironment,
  resolveActiveProjectId,
} from './config/environment';
import {
  consentFunctionSecrets,
  igniteEnvParam,
} from './config/functionParams';
import { claimParentalConsent as claimParentalConsentUseCase } from './consent/claimConsent';
import { sendScheduledConfirmationEmail } from './consent/confirmationTask';
import { createParentalConsentRequest as createParentalConsentRequestUseCase } from './consent/createRequest';
import { getParentalConsentStatus as getParentalConsentStatusUseCase } from './consent/getStatus';
import { resendParentalConsentNotice as resendParentalConsentNoticeUseCase } from './consent/resendNotice';
import { buildConsentServiceDeps } from './consent/serviceDeps';
import { updateParentalConsentEmail as updateParentalConsentEmailUseCase } from './consent/updateEmail';
import { parentConsentRouter } from './http/parentConsentHttp';
import { clientIpFromRawRequest, toHttpsError } from './http/errors';
import { layoutPage, outcomeHtml } from './http/parentConsentPages';
import { applySecurityHeaders } from './http/securityHeaders';

function guardEnvironment(): void {
  if (!process.env.IGNITE_ENV?.trim()) {
    process.env.IGNITE_ENV = igniteEnvParam.value();
  }
  const env = readIgniteEnvironment();
  assertProjectMatchesEnvironment(env, resolveActiveProjectId());
}

const callableOpts = {
  ...appCheckCallableOptions(),
  secrets: consentFunctionSecrets,
};

export const createParentalConsentRequest = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const parentEmail = String(request.data?.parentEmail ?? '');
      const deps = buildConsentServiceDeps();
      return await createParentalConsentRequestUseCase(deps, {
        parentEmail,
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const getParentalConsentStatus = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps({ skipEmail: true });
      return await getParentalConsentStatusUseCase(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const resendParentalConsentNotice = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps();
      return await resendParentalConsentNoticeUseCase(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const updateParentalConsentEmail = onCall(
  callableOpts,
  async (request) => {
    try {
      guardEnvironment();
      const deps = buildConsentServiceDeps();
      return await updateParentalConsentEmailUseCase(deps, {
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

/**
 * Claim is the only consent callable that always sends a Firebase Auth ID token.
 * Gen2 Cloud Run must allow unauthenticated invoke (invoker public) so IAM does not
 * attempt to verify that Firebase token as a Google identity token; Auth is enforced
 * below via request.auth.
 */
export const claimParentalConsent = onCall(
  {
    ...callableOpts,
    invoker: 'public',
  },
  async (request) => {
    try {
      guardEnvironment();

      if (!request.auth?.uid) {
        throw new HttpsError(
          'unauthenticated',
          'Authentication is required to claim parental consent.',
        );
      }

      const deps = buildConsentServiceDeps({ skipEmail: true });
      return await claimParentalConsentUseCase(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
        authenticatedUid: request.auth.uid,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

/**
 * Hosting rewrite target for all /parent-consent* routes.
 * GET never mutates consent; POST requires sealed session + CSRF.
 */
export const parentalConsentHosting = onRequest(
  {
    cors: false,
    secrets: consentFunctionSecrets,
    // Hosting rewrites are unauthenticated; mutations still require sealed session + CSRF.
    invoker: 'public',
  },
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
    secrets: consentFunctionSecrets,
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

// Intentionally NOT exported: processInitialConsentHttp / processConfirmationHttp /
// revokeConsentHttp — raw-token mutation bypasses removed in Phase 6.5B (ADR-009).
// Callable names match the Phase 6.5A plan; do not also export *Fn aliases
// (that would deploy duplicate Cloud Run services).
