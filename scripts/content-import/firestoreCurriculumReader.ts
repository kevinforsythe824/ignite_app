import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import type { DevImportEnvironment } from './environmentGate';
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

/**
 * Read-only loader for one season's curriculum tree.
 * Opens Admin only after the DEV environment gate has already passed.
 */
export function openFirestoreCurriculumReader(
  target: DevImportEnvironment,
): CurriculumReadPort {
  return {
    async loadSeasonCurriculum(seasonId: string): Promise<SeasonCurriculumSnapshot> {
      const app =
        getApps().length > 0
          ? getApps()[0]
          : initializeApp({
              credential: applicationDefault(),
              projectId: target.projectId,
            });
      const db = getFirestore(app);
      return readSeasonCurriculum(db, seasonId);
    },
  };
}

async function readSeasonCurriculum(
  db: ReturnType<typeof getFirestore>,
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
    documents.push({
      path: materialSetDocumentPath(seasonId, materialSetId),
      data: materialSetDoc.data(),
    });

    const sections = await materialSetDoc.ref.collection('sections').get();
    for (const sectionDoc of sections.docs) {
      documents.push({
        path: sectionDocumentPath(seasonId, materialSetId, sectionDoc.id),
        data: sectionDoc.data(),
      });
    }

    const cards = await materialSetDoc.ref.collection('cards').get();
    for (const cardDoc of cards.docs) {
      documents.push({
        path: cardDocumentPath(seasonId, materialSetId, cardDoc.id),
        data: cardDoc.data(),
      });
    }
  }

  return { seasonId, documents };
}
