import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';

import { appCheckCallableOptions } from './config/appCheck';
import {
  assertProjectMatchesEnvironment,
  readIgniteEnvironment,
  resolveActiveProjectId,
} from './config/environment';
import { claimParentalConsent } from './consent/claimConsent';
import { createParentalConsentRequest } from './consent/createRequest';
import { getParentalConsentStatus } from './consent/getStatus';
import {
  processConfirmation,
  processInitialConsent,
  revokeConsent,
} from './consent/processInitialConsent';
import { resendParentalConsentNotice } from './consent/resendNotice';
import { buildConsentServiceDeps } from './consent/serviceDeps';
import { updateParentalConsentEmail } from './consent/updateEmail';
import { clientIpFromRawRequest, toHttpsError } from './http/errors';

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
      await resendParentalConsentNotice(deps, {
        requestId: String(request.data?.requestId ?? ''),
        clientSessionToken: String(request.data?.clientSessionToken ?? ''),
        clientIp: clientIpFromRawRequest(request.rawRequest),
      });
      return { ok: true };
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
    // Never trust a client-supplied uid.
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

function readJsonToken(body: unknown): string {
  if (body && typeof body === 'object' && 'token' in body) {
    return String((body as { token: unknown }).token ?? '');
  }
  return '';
}

async function handlePostToken(
  req: { method?: string; body?: unknown; ip?: string; headers?: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  },
  action: 'initial' | 'confirm' | 'revoke',
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    guardEnvironment();
    const deps = buildConsentServiceDeps();
    const token = readJsonToken(req.body);
    const ip = clientIpFromRawRequest(req);
    let result;
    if (action === 'initial') {
      result = await processInitialConsent(deps, token, ip);
    } else if (action === 'confirm') {
      result = await processConfirmation(deps, token, ip);
    } else {
      result = await revokeConsent(deps, token, ip);
    }
    res.status(200).json(result);
  } catch (error) {
    const httpsError = toHttpsError(error);
    const status =
      httpsError.code === 'invalid-argument'
        ? 400
        : httpsError.code === 'permission-denied' ||
            httpsError.code === 'unauthenticated'
          ? 403
          : httpsError.code === 'not-found'
            ? 404
            : httpsError.code === 'resource-exhausted'
              ? 429
              : 400;
    res.status(status).json({ error: httpsError.message, code: httpsError.code });
  }
}

/** POST-only parent action seams (no GET mutation). */
export const processInitialConsentHttp = onRequest(async (req, res) => {
  await handlePostToken(req, res, 'initial');
});

export const processConfirmationHttp = onRequest(async (req, res) => {
  await handlePostToken(req, res, 'confirm');
});

export const revokeConsentHttp = onRequest(async (req, res) => {
  await handlePostToken(req, res, 'revoke');
});

// Public callable names matching the Phase 6.5A plan.
export {
  createParentalConsentRequestFn as createParentalConsentRequest,
  getParentalConsentStatusFn as getParentalConsentStatus,
  resendParentalConsentNoticeFn as resendParentalConsentNotice,
  updateParentalConsentEmailFn as updateParentalConsentEmail,
  claimParentalConsentFn as claimParentalConsent,
};
