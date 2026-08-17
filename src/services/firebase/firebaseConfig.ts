/**
 * Firebase JS SDK web-app client configuration.
 * These values identify the Firebase project to the client; they are not
 * server credentials. Do not add service-account or Admin SDK keys here.
 */

import {
  assertProjectIdForEnvironment,
  readIgniteEnvironment,
} from './firebaseEnvironments';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const FIREBASE_CLIENT_ENV_KEYS = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
} as const;

export class FirebaseNotConfiguredError extends Error {
  readonly missingKeys: readonly string[];

  constructor(missingKeys: readonly string[]) {
    super(
      `Firebase client configuration is incomplete. Missing: ${missingKeys.join(', ')}`,
    );
    this.name = 'FirebaseNotConfiguredError';
    this.missingKeys = missingKeys;
  }
}

type EnvSource = Record<string, string | undefined>;

function readEnvValue(env: EnvSource, key: string): string | undefined {
  const value = env[key]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

/** Reads Expo public env vars into the Firebase JS SDK config object. */
export function readFirebaseClientConfig(
  env: EnvSource = process.env,
): FirebaseClientConfig {
  const environment = readIgniteEnvironment(env);
  const missingKeys: string[] = [];
  const values: Partial<FirebaseClientConfig> = {};

  (Object.entries(FIREBASE_CLIENT_ENV_KEYS) as Array<
    [keyof FirebaseClientConfig, string]
  >).forEach(([field, envKey]) => {
    const value = readEnvValue(env, envKey);
    if (value === undefined) {
      missingKeys.push(envKey);
      return;
    }
    values[field] = value;
  });

  if (missingKeys.length > 0) {
    throw new FirebaseNotConfiguredError(missingKeys);
  }

  const config = values as FirebaseClientConfig;
  assertProjectIdForEnvironment(environment, config.projectId);
  return config;
}
