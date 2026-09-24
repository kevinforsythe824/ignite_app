import type { DevImportEnvironment } from './environmentGate';
import { openContentImportAdminApp } from './adminApp';
import {
  cardDocumentPath,
  materialSetDocumentPath,
  seasonDocumentPath,
  sectionDocumentPath,
} from './paths';
import type {
  CurriculumReadPort,
  SeasonCurriculumSnapshot,
  StoredCurriculumDocument,
} from './types';

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  collection(name: string): CollectionRef;
}

interface QueryDoc {
  id: string;
  ref: DocRef;
  data(): Record<string, unknown> | undefined;
}

interface CollectionRef {
  get(): Promise<{ docs: QueryDoc[] }>;
  doc(id: string): DocRef;
}

interface FirestoreDb {
  collection(name: string): CollectionRef;
}

export interface FirestoreCurriculumReaderDependencies {
  resolveApp?: (projectId: string) => Promise<unknown>;
  getFirestore?: (app: unknown) => FirestoreDb | Promise<FirestoreDb>;
}

async function defaultResolveApp(projectId: string): Promise<unknown> {
  return openContentImportAdminApp(projectId);
}

async function defaultGetFirestore(app: unknown): Promise<FirestoreDb> {
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(app as never) as unknown as FirestoreDb;
}

/**
 * Read-only loader for one season's curriculum tree.
 * Opens the named Admin app only after the DEV environment gate has already passed.
 */
export function openFirestoreCurriculumReader(
  target: DevImportEnvironment,
  dependencies: FirestoreCurriculumReaderDependencies = {},
): CurriculumReadPort {
  return {
    async loadSeasonCurriculum(seasonId: string): Promise<SeasonCurriculumSnapshot> {
      const resolveApp = dependencies.resolveApp ?? defaultResolveApp;
      const getDb = dependencies.getFirestore ?? defaultGetFirestore;
      const app = await resolveApp(target.projectId);
      const db = await getDb(app);
      return readSeasonCurriculum(db, seasonId);
    },
  };
}

async function readSeasonCurriculum(
  db: FirestoreDb,
  seasonId: string,
): Promise<SeasonCurriculumSnapshot> {
  const documents: StoredCurriculumDocument[] = [];
  const seasonRef = db.collection('seasons').doc(seasonId);
  const seasonSnap = await seasonRef.get();
  if (seasonSnap.exists) {
    const data = seasonSnap.data();
    if (data) {
      documents.push({ path: seasonDocumentPath(seasonId), data });
    }
  }

  const materialSets = await seasonRef.collection('materialSets').get();
  for (const materialSetDoc of materialSets.docs) {
    const materialSetId = materialSetDoc.id;
    const materialSetData = materialSetDoc.data();
    if (materialSetData) {
      documents.push({
        path: materialSetDocumentPath(seasonId, materialSetId),
        data: materialSetData,
      });
    }

    const sections = await materialSetDoc.ref.collection('sections').get();
    for (const sectionDoc of sections.docs) {
      const sectionData = sectionDoc.data();
      if (!sectionData) {
        continue;
      }
      documents.push({
        path: sectionDocumentPath(seasonId, materialSetId, sectionDoc.id),
        data: sectionData,
      });
    }

    const cards = await materialSetDoc.ref.collection('cards').get();
    for (const cardDoc of cards.docs) {
      const cardData = cardDoc.data();
      if (!cardData) {
        continue;
      }
      documents.push({
        path: cardDocumentPath(seasonId, materialSetId, cardDoc.id),
        data: cardData,
      });
    }
  }

  return { seasonId, documents };
}
