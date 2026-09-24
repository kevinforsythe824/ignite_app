export type CurriculumDocumentKind = 'season' | 'materialSet' | 'section' | 'card';

export function seasonDocumentPath(seasonId: string): string {
  return `seasons/${seasonId}`;
}

export function materialSetDocumentPath(seasonId: string, materialSetId: string): string {
  return `${seasonDocumentPath(seasonId)}/materialSets/${materialSetId}`;
}

export function sectionDocumentPath(
  seasonId: string,
  materialSetId: string,
  sectionId: string,
): string {
  return `${materialSetDocumentPath(seasonId, materialSetId)}/sections/${sectionId}`;
}

export function cardDocumentPath(
  seasonId: string,
  materialSetId: string,
  cardId: string,
): string {
  return `${materialSetDocumentPath(seasonId, materialSetId)}/cards/${cardId}`;
}

/** Curriculum paths under one season. Other collections are out of scope. */
export function classifyCurriculumPath(
  seasonId: string,
  documentPath: string,
): CurriculumDocumentKind | null {
  const seasonPath = seasonDocumentPath(seasonId);
  if (documentPath === seasonPath) {
    return 'season';
  }

  const prefix = `${seasonPath}/materialSets/`;
  if (!documentPath.startsWith(prefix)) {
    return null;
  }

  const parts = documentPath.slice(prefix.length).split('/');
  if (parts.length === 1 && parts[0]) {
    return 'materialSet';
  }
  if (parts.length === 3 && parts[1] === 'sections' && parts[0] && parts[2]) {
    return 'section';
  }
  if (parts.length === 3 && parts[1] === 'cards' && parts[0] && parts[2]) {
    return 'card';
  }
  return null;
}
