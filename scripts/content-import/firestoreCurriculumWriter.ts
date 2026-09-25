import { CONTENT_IMPORT_WRITE_CHUNK_SIZE } from './constants';
import type { CurriculumDocumentKind } from './paths';
import type { CurriculumWritePort } from './types';

export class ContentImportWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentImportWriteError';
  }
}

type WritePhase =
  | 'season-importing'
  | 'material-set-upsert'
  | 'section-upsert'
  | 'card-upsert'
  | 'card-delete'
  | 'section-delete'
  | 'material-set-delete'
  | 'season-complete';

const PHASE_ORDER: readonly WritePhase[] = [
  'season-importing',
  'material-set-upsert',
  'section-upsert',
  'card-upsert',
  'card-delete',
  'section-delete',
  'material-set-delete',
  'season-complete',
];

interface BufferedOperation {
  kind: 'upsert' | 'remove';
  path: string;
  data?: Record<string, unknown>;
}

export interface CurriculumBatchSink {
  commit(operations: readonly BufferedOperation[]): Promise<void>;
}

interface FirestoreBatch {
  set(path: string, data: Record<string, unknown>): void;
  delete(path: string): void;
  commit(): Promise<void>;
}

interface PhaseBatchDb {
  batch(): FirestoreBatch;
}

function phaseIndex(phase: WritePhase): number {
  return PHASE_ORDER.indexOf(phase);
}

function kindFromPath(documentPath: string): CurriculumDocumentKind | null {
  const parts = documentPath.split('/');
  if (parts.length === 2 && parts[0] === 'seasons' && parts[1]) {
    return 'season';
  }
  if (parts.length === 4 && parts[0] === 'seasons' && parts[1] && parts[2] === 'materialSets' && parts[3]) {
    return 'materialSet';
  }
  if (
    parts.length === 6 &&
    parts[0] === 'seasons' &&
    parts[1] &&
    parts[2] === 'materialSets' &&
    parts[3] &&
    parts[5]
  ) {
    if (parts[4] === 'sections') {
      return 'section';
    }
    if (parts[4] === 'cards') {
      return 'card';
    }
  }
  return null;
}

/**
 * Buffers orchestrated upsert/remove calls and commits one phase at a time.
 * A later phase is not added to a commit until the previous phase has committed.
 */
export function createBufferedCurriculumWriter(
  sink: CurriculumBatchSink,
  chunkSize: number = CONTENT_IMPORT_WRITE_CHUNK_SIZE,
): CurriculumWritePort {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize >= 500) {
    throw new ContentImportWriteError('Content import chunk size must be an integer from 1 through 499.');
  }

  let phase: WritePhase | null = null;
  let seasonUpserts = 0;
  let chunkInPhase = 0;
  const buffer: BufferedOperation[] = [];

  async function commitChunk(): Promise<void> {
    if (buffer.length === 0 || phase === null) {
      return;
    }
    const operations = buffer.splice(0, Math.min(chunkSize, buffer.length));
    chunkInPhase += 1;
    const activePhase = phase;
    const chunkNumber = chunkInPhase;
    try {
      await sink.commit(operations);
    } catch {
      throw new ContentImportWriteError(
        `Content import write failed during phase ${activePhase} chunk ${chunkNumber}. Import is incomplete. The season may remain importing.`,
      );
    }
  }

  async function commitPhase(): Promise<void> {
    while (buffer.length > 0) {
      await commitChunk();
    }
  }

  async function enter(next: WritePhase): Promise<void> {
    if (phase === next) {
      return;
    }
    if (phase !== null && phaseIndex(next) < phaseIndex(phase)) {
      throw new ContentImportWriteError(
        `Content import refused out-of-order phase ${next} after ${phase}.`,
      );
    }
    await commitPhase();
    phase = next;
    chunkInPhase = 0;
  }

  async function enqueue(next: WritePhase, operation: BufferedOperation): Promise<void> {
    await enter(next);
    buffer.push(operation);
    if (buffer.length >= chunkSize) {
      await commitChunk();
    }
    if (next === 'season-importing' || next === 'season-complete') {
      await commitPhase();
    }
  }

  return {
    async upsert(path: string, data: Record<string, unknown>): Promise<void> {
      const kind = kindFromPath(path);
      if (kind === 'season') {
        seasonUpserts += 1;
        const next: WritePhase = seasonUpserts === 1 ? 'season-importing' : 'season-complete';
        if (seasonUpserts > 2) {
          throw new ContentImportWriteError('Content import refused an extra season write.');
        }
        await enqueue(next, { kind: 'upsert', path, data });
        return;
      }
      if (kind === 'materialSet') {
        await enqueue('material-set-upsert', { kind: 'upsert', path, data });
        return;
      }
      if (kind === 'section') {
        await enqueue('section-upsert', { kind: 'upsert', path, data });
        return;
      }
      if (kind === 'card') {
        await enqueue('card-upsert', { kind: 'upsert', path, data });
        return;
      }
      throw new ContentImportWriteError(`Content import refused an unsupported curriculum path: ${path}`);
    },
    async remove(path: string): Promise<void> {
      const kind = kindFromPath(path);
      if (kind === 'card') {
        await enqueue('card-delete', { kind: 'remove', path });
        return;
      }
      if (kind === 'section') {
        await enqueue('section-delete', { kind: 'remove', path });
        return;
      }
      if (kind === 'materialSet') {
        await enqueue('material-set-delete', { kind: 'remove', path });
        return;
      }
      throw new ContentImportWriteError(`Content import refused an unsupported removal path: ${path}`);
    },
  };
}

/**
 * Firestore adapter for one verified Admin app.
 * The caller passes the named content-import app. This module does not select a default app.
 */
export function openFirestoreCurriculumWriter(
  app: unknown,
  options: { chunkSize?: number; getFirestore?: (app: unknown) => PhaseBatchDb | Promise<PhaseBatchDb> } = {},
): CurriculumWritePort {
  let database: PhaseBatchDb | undefined;
  const sink: CurriculumBatchSink = {
    async commit(operations: readonly BufferedOperation[]): Promise<void> {
      if (!database) {
        const resolve = options.getFirestore ?? defaultGetFirestore;
        database = await resolve(app);
      }
      const batch = database.batch();
      for (const operation of operations) {
        if (operation.kind === 'upsert') {
          batch.set(operation.path, operation.data ?? {});
        } else {
          batch.delete(operation.path);
        }
      }
      await batch.commit();
    },
  };
  return createBufferedCurriculumWriter(sink, options.chunkSize ?? CONTENT_IMPORT_WRITE_CHUNK_SIZE);
}

async function defaultGetFirestore(app: unknown): Promise<PhaseBatchDb> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore(app as never);
  return {
    batch(): FirestoreBatch {
      const write = db.batch();
      return {
        set(path: string, data: Record<string, unknown>): void {
          write.set(db.doc(path), data);
        },
        delete(path: string): void {
          write.delete(db.doc(path));
        },
        async commit(): Promise<void> {
          await write.commit();
        },
      };
    },
  };
}
