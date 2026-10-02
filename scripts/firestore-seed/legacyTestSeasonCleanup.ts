import {
  FirebaseEnvironmentError,
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
  assertProjectIdForEnvironment,
  readIgniteEnvironment,
} from '../../src/services/firebase/firebaseEnvironments';

/** Exact retired live document. This tool does not accept another Season id. */
export const LEGACY_TEST_SEASON_DOCUMENT_ID = 'test-season' as const;

export const LEGACY_TEST_SEASON_DOCUMENT_PATH = 'seasons/test-season' as const;

export const LEGACY_TEST_SEASON_CARDS_COLLECTION = 'cards' as const;

/** Title written by the retired live seed (`{ title }` only). */
export const LEGACY_TEST_SEASON_TITLE = 'Luke 2:1-9' as const;

const LEGACY_CARD_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const LEGACY_CARD_FIELD_NAMES = [
  'card_number',
  'reference',
  'verse_text',
  'index_code',
  'matched_rules',
  'tags',
] as const;

const MODERN_SEASON_FIELD_NAMES = [
  'seasonId',
  'name',
  'status',
  'startDate',
  'endDate',
  'sourceMaterialReleaseDate',
  'igniteAvailabilityDate',
  'provenance',
] as const;

export class LegacyTestSeasonCleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyTestSeasonCleanupError';
  }
}

export interface DevLegacyTestSeasonCleanupTarget {
  environment: 'dev';
  projectId: string;
}

export interface LegacyTestSeasonCardSnapshot {
  cardId: string;
  /** False when listDocuments found a path whose document is missing. */
  exists: boolean;
  data: Record<string, unknown> | null;
  subcollectionIds: readonly string[];
}

export interface LegacyTestSeasonSnapshot {
  exists: boolean;
  data: Record<string, unknown> | null;
  subcollectionIds: readonly string[];
  cards: readonly LegacyTestSeasonCardSnapshot[];
}

/** Reads and deletes only the closed-over seasons/test-season tree. */
export interface LegacyTestSeasonPort {
  read(): Promise<LegacyTestSeasonSnapshot>;
  deleteCard(cardId: string): Promise<void>;
  deleteSeason(): Promise<void>;
}

export type LegacyTestSeasonCleanupPlan =
  | {
      outcome: 'absent';
      documentPath: typeof LEGACY_TEST_SEASON_DOCUMENT_PATH;
      cardIds: readonly [];
      cardPaths: readonly [];
    }
  | {
      outcome: 'delete';
      documentPath: typeof LEGACY_TEST_SEASON_DOCUMENT_PATH;
      fields: readonly ['title'];
      title: typeof LEGACY_TEST_SEASON_TITLE;
      cardIds: readonly string[];
      cardPaths: readonly string[];
    }
  | {
      outcome: 'refused';
      documentPath: typeof LEGACY_TEST_SEASON_DOCUMENT_PATH;
      reason: string;
    };

export interface LegacyTestSeasonCleanupExecution {
  target: DevLegacyTestSeasonCleanupTarget;
  plan: Exclude<LegacyTestSeasonCleanupPlan, { outcome: 'refused' }>;
  deleted: boolean;
}

function configuredProjectId(env: Record<string, string | undefined>): string | undefined {
  const fromFirebase = env.FIREBASE_PROJECT_ID?.trim();
  const fromExpo = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (fromFirebase && fromExpo && fromFirebase !== fromExpo) {
    throw new LegacyTestSeasonCleanupError(
      'FIREBASE_PROJECT_ID and EXPO_PUBLIC_FIREBASE_PROJECT_ID do not agree.',
    );
  }
  const projectId = fromFirebase || fromExpo;
  return projectId && projectId.length > 0 ? projectId : undefined;
}

/**
 * DEV-only gate. Does not infer a project from a CLI argument and does not open Firebase.
 */
export function assertDevLegacyTestSeasonCleanupTarget(
  env: Record<string, string | undefined>,
): DevLegacyTestSeasonCleanupTarget {
  let environment;
  try {
    environment = readIgniteEnvironment(env);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError
        ? error.message
        : 'Invalid Ignite environment.';
    throw new LegacyTestSeasonCleanupError(message);
  }

  switch (environment) {
    case 'prod':
      throw new LegacyTestSeasonCleanupError(
        `Refusing legacy test-season cleanup for production (${IGNITE_FIREBASE_PROJECTS.prod}).`,
      );
    case 'staging':
      throw new LegacyTestSeasonCleanupError(
        `Refusing legacy test-season cleanup for staging (${IGNITE_FIREBASE_PROJECTS.staging}). This corrective operation is DEV-only.`,
      );
    case 'dev':
      break;
    default: {
      const unexpected: never = environment;
      throw new LegacyTestSeasonCleanupError(
        `Refusing legacy test-season cleanup for ${IGNITE_ENV_KEY}=${String(unexpected)}. This corrective operation is DEV-only.`,
      );
    }
  }

  const projectId = configuredProjectId(env);
  if (!projectId) {
    throw new LegacyTestSeasonCleanupError(
      `Missing FIREBASE_PROJECT_ID (or EXPO_PUBLIC_FIREBASE_PROJECT_ID). Expected ${IGNITE_FIREBASE_PROJECTS.dev}.`,
    );
  }

  try {
    assertProjectIdForEnvironment(environment, projectId);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError
        ? error.message
        : 'Firebase project mismatch.';
    throw new LegacyTestSeasonCleanupError(message);
  }

  return { environment: 'dev', projectId: IGNITE_FIREBASE_PROJECTS.dev };
}

/**
 * Fail closed before Admin initialization. Does not unset the variable.
 * Dry-run and `--apply` both refuse a non-empty host.
 */
export function assertLegacyCleanupNotUsingFirestoreEmulator(
  env: Record<string, string | undefined>,
): void {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST;
  if (typeof emulatorHost === 'string' && emulatorHost.trim().length > 0) {
    throw new LegacyTestSeasonCleanupError(
      'Refusing legacy test-season cleanup while FIRESTORE_EMULATOR_HOST is set. This one-time live DEV cleanup must not run through the Firestore emulator.',
    );
  }
}

/** Rejects every argument except an optional exact `--apply` flag. */
export function parseLegacyTestSeasonCleanupArgs(
  argv: readonly string[],
): { apply: boolean } {
  const args = argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) {
    throw new LegacyTestSeasonCleanupError(
      'Unsupported argument. This cleanup only accepts optional --apply. It always targets seasons/test-season on verified DEV and does not accept a Season id or project id.',
    );
  }
  return { apply: args.length === 1 };
}

function refusal(detail: string): LegacyTestSeasonCleanupPlan {
  return {
    outcome: 'refused',
    documentPath: LEGACY_TEST_SEASON_DOCUMENT_PATH,
    reason: `Refusing to clean ${LEGACY_TEST_SEASON_DOCUMENT_PATH}: ${detail} Manual review is required.`,
  };
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

const LEGACY_MATCHED_RULE_FIELDS = ['notes', 'rule_category', 'rule_name'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Stored matched_rules must match the object buildFirestoreCardSeedRecords writes:
 * exact keys, non-empty rule_name and rule_category, and a string notes field.
 */
function isLegacyMatchedRule(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const rule = value as Record<string, unknown>;
  if (!hasExactKeys(rule, LEGACY_MATCHED_RULE_FIELDS)) {
    return false;
  }
  return (
    isNonEmptyString(rule.rule_name) &&
    isNonEmptyString(rule.rule_category) &&
    typeof rule.notes === 'string'
  );
}

/** Tags are a string array, including empty strings, matching the retired writer. */
function isLegacyTags(value: unknown): boolean {
  return Array.isArray(value) && value.every((tag) => typeof tag === 'string');
}

function isLegacyCardDocument(data: Record<string, unknown>): boolean {
  if (!hasExactKeys(data, LEGACY_CARD_FIELD_NAMES)) {
    return false;
  }
  return (
    typeof data.card_number === 'number' &&
    Number.isInteger(data.card_number) &&
    data.card_number >= 1 &&
    isNonEmptyString(data.reference) &&
    isNonEmptyString(data.verse_text) &&
    isNonEmptyString(data.index_code) &&
    Array.isArray(data.matched_rules) &&
    data.matched_rules.every(isLegacyMatchedRule) &&
    isLegacyTags(data.tags)
  );
}

function cardPath(cardId: string): string {
  return `${LEGACY_TEST_SEASON_DOCUMENT_PATH}/${LEGACY_TEST_SEASON_CARDS_COLLECTION}/${cardId}`;
}

/**
 * Plans deletion of seasons/test-season only.
 * The snapshot is whatever the port read from that exact document.
 */
export function planLegacyTestSeasonCleanup(
  snapshot: LegacyTestSeasonSnapshot,
): LegacyTestSeasonCleanupPlan {
  const data = snapshot.data;
  const leftoverChildren =
    snapshot.cards.length > 0 || snapshot.subcollectionIds.length > 0;

  if (!snapshot.exists || data === null) {
    if (!snapshot.exists && !leftoverChildren) {
      return {
        outcome: 'absent',
        documentPath: LEGACY_TEST_SEASON_DOCUMENT_PATH,
        cardIds: [],
        cardPaths: [],
      };
    }
    return refusal(
      snapshot.exists
        ? 'the document has no fields.'
        : 'the parent document is absent but child data remains.',
    );
  }

  const modernFields = MODERN_SEASON_FIELD_NAMES.filter((field) =>
    Object.prototype.hasOwnProperty.call(data, field),
  );
  if (modernFields.length > 0) {
    return refusal(
      `modern Season fields are present (${modernFields.join(', ')}).`,
    );
  }

  if (!hasExactKeys(data, ['title']) || data.title !== LEGACY_TEST_SEASON_TITLE) {
    const observed = Object.keys(data).sort().join(', ') || '(none)';
    const title = typeof data.title === 'string' ? data.title : '(not a string)';
    return refusal(
      `the document does not match the retired fixture (fields: ${observed}; title: ${title}).`,
    );
  }

  const unexpectedSubcollections = snapshot.subcollectionIds.filter(
    (id) => id !== LEGACY_TEST_SEASON_CARDS_COLLECTION,
  );
  if (unexpectedSubcollections.length > 0) {
    return refusal(
      `unexpected subcollections are present (${unexpectedSubcollections.join(', ')}).`,
    );
  }

  const cards = [...snapshot.cards].sort((left, right) =>
    left.cardId.localeCompare(right.cardId),
  );
  for (const card of cards) {
    if (!LEGACY_CARD_ID_PATTERN.test(card.cardId)) {
      return refusal(`card id "${card.cardId}" is not a legacy fixture id.`);
    }
  }
  for (const card of cards) {
    if (!card.exists) {
      return refusal(
        `card "${card.cardId}" has no document. Descendants are not deleted, and the entire tree is refused.`,
      );
    }
  }
  for (const card of cards) {
    if (card.data === null || !isLegacyCardDocument(card.data)) {
      return refusal(`card "${card.cardId}" does not match the legacy flat card shape.`);
    }
  }
  for (const card of cards) {
    if (card.subcollectionIds.length > 0) {
      return refusal(
        `card "${card.cardId}" has nested subcollections (${card.subcollectionIds.join(', ')}). The entire tree is refused.`,
      );
    }
  }

  return {
    outcome: 'delete',
    documentPath: LEGACY_TEST_SEASON_DOCUMENT_PATH,
    fields: ['title'] as const,
    title: LEGACY_TEST_SEASON_TITLE,
    cardIds: cards.map((card) => card.cardId),
    cardPaths: cards.map((card) => cardPath(card.cardId)),
  };
}

export interface LegacyTestSeasonDocumentProbe {
  readonly exists: boolean;
  data(): unknown;
}

export interface LegacyTestSeasonNamedChild {
  readonly id: string;
}

/** One card path returned by collection.listDocuments(), including missing documents. */
export interface LegacyTestSeasonCardProbe {
  readonly id: string;
  get(): Promise<LegacyTestSeasonDocumentProbe>;
  listCollections(): Promise<readonly LegacyTestSeasonNamedChild[]>;
}

/**
 * Narrow read surface. Production binds this to Admin SDK listDocuments/get/listCollections.
 * Tests pass a fake with the same methods.
 */
export interface LegacyTestSeasonReadSource {
  get(): Promise<LegacyTestSeasonDocumentProbe>;
  listCollections(): Promise<readonly LegacyTestSeasonNamedChild[]>;
  listCardDocuments(): Promise<readonly LegacyTestSeasonCardProbe[]>;
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    copy[key] = field;
  }
  return copy;
}

/**
 * Enumerates seasons/test-season without deleting.
 * Card paths come only from listCardDocuments(), which the Admin port implements
 * with CollectionReference.listDocuments() so missing documents that still have
 * descendants are included.
 */
export async function readLegacyTestSeasonTree(
  source: LegacyTestSeasonReadSource,
): Promise<LegacyTestSeasonSnapshot> {
  const seasonSnap = await source.get();
  const collections = await source.listCollections();
  const cardRefs = await source.listCardDocuments();
  const cards: LegacyTestSeasonCardSnapshot[] = [];
  for (const cardRef of cardRefs) {
    const cardSnap = await cardRef.get();
    const nested = await cardRef.listCollections();
    cards.push({
      cardId: cardRef.id,
      exists: cardSnap.exists,
      data: cardSnap.exists ? plainRecord(cardSnap.data()) : null,
      subcollectionIds: nested.map((collection) => collection.id),
    });
  }
  return {
    exists: seasonSnap.exists,
    data: seasonSnap.exists ? plainRecord(seasonSnap.data()) : null,
    subcollectionIds: collections.map((collection) => collection.id),
    cards,
  };
}

/**
 * Dry-run reads and returns a plan. `--apply` deletes planned legacy cards, then the parent.
 * Discovery and validation finish before the first delete. A refused shape throws and
 * deletes nothing. An absent target is a successful no-op.
 *
 * Card deletes are sequential, then the parent. A network failure can leave a partial
 * tree. The next run reads and revalidates whatever remains before deleting again.
 * The parent is never deleted first.
 */
export async function executeLegacyTestSeasonCleanup(input: {
  env: Record<string, string | undefined>;
  apply: boolean;
  port: LegacyTestSeasonPort;
}): Promise<LegacyTestSeasonCleanupExecution> {
  const target = assertDevLegacyTestSeasonCleanupTarget(input.env);
  assertLegacyCleanupNotUsingFirestoreEmulator(input.env);
  const plan = planLegacyTestSeasonCleanup(await input.port.read());
  if (plan.outcome === 'refused') {
    throw new LegacyTestSeasonCleanupError(plan.reason);
  }
  if (!input.apply || plan.outcome === 'absent') {
    return { target, plan, deleted: false };
  }

  const confirmed = planLegacyTestSeasonCleanup(await input.port.read());
  if (confirmed.outcome === 'refused') {
    throw new LegacyTestSeasonCleanupError(confirmed.reason);
  }
  if (confirmed.outcome === 'absent') {
    return { target, plan: confirmed, deleted: false };
  }

  for (const cardId of confirmed.cardIds) {
    await input.port.deleteCard(cardId);
  }
  await input.port.deleteSeason();
  return { target, plan: confirmed, deleted: true };
}
