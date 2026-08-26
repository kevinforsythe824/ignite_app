/**
 * Load DEV Firebase web config for consent harness scripts.
 * Prefers process env (e.g. --env-file=.env.local). Never logs secret values.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface DevWebFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

function readEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadDevWebFirebaseConfig(): DevWebFirebaseConfig {
  const fileEnv = readEnvFile(resolve(process.cwd(), '.env.local'));
  const env = { ...fileEnv, ...process.env };

  const igniteEnv = env.EXPO_PUBLIC_IGNITE_ENV?.trim();
  const projectId =
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || env.GCLOUD_PROJECT?.trim();
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();

  if (igniteEnv && igniteEnv !== 'dev') {
    throw new Error(
      `Refusing consent harness: EXPO_PUBLIC_IGNITE_ENV=${igniteEnv} (expected dev).`,
    );
  }
  if (projectId !== 'wpf-bible-qizzing') {
    throw new Error(
      `Refusing consent harness: project is "${projectId ?? 'missing'}" (expected wpf-bible-qizzing).`,
    );
  }
  if (!apiKey || !authDomain || !appId) {
    throw new Error(
      'Missing DEV web config. Copy .env.dev.example to .env.local and fill Firebase web-app values.',
    );
  }

  return { apiKey, authDomain, projectId, appId };
}
