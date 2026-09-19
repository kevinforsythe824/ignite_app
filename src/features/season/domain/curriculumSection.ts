/**
 * Ordered membership of Cards inside a MaterialSet (PRD §12).
 * Sections do not copy Cards — they list cardIds only.
 * “All Material” is the full MaterialSet card list, not a synthetic section.
 */

export interface CurriculumSection {
  seasonId: string;
  materialSetId: string;
  sectionId: string;
  title: string;
  description?: string;
  displayOrder: number;
  /** Ordered membership; Cards are not copied into the section. */
  cardIds: readonly string[];
}

export class CurriculumSectionInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurriculumSectionInvariantError';
  }
}

/**
 * Validates section membership/order invariants for one MaterialSet:
 * unique sectionId; no duplicate cardIds in a section; cardIds ⊆ materialSet cards.
 */
export function assertCurriculumSectionInvariants(
  sections: readonly CurriculumSection[],
  materialSetCardIds: ReadonlySet<string>,
): void {
  const seenSectionIds = new Set<string>();

  for (const section of sections) {
    if (seenSectionIds.has(section.sectionId)) {
      throw new CurriculumSectionInvariantError(
        `Duplicate sectionId "${section.sectionId}" within MaterialSet`,
      );
    }
    seenSectionIds.add(section.sectionId);

    const seenCardIds = new Set<string>();
    for (const cardId of section.cardIds) {
      if (seenCardIds.has(cardId)) {
        throw new CurriculumSectionInvariantError(
          `Duplicate cardId "${cardId}" in section "${section.sectionId}"`,
        );
      }
      seenCardIds.add(cardId);

      if (!materialSetCardIds.has(cardId)) {
        throw new CurriculumSectionInvariantError(
          `cardId "${cardId}" in section "${section.sectionId}" is not in the MaterialSet`,
        );
      }
    }
  }
}

/** Stable sort by displayOrder, then sectionId so equal orders stay deterministic. */
export function sortCurriculumSections(
  sections: readonly CurriculumSection[],
): CurriculumSection[] {
  return [...sections].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.sectionId.localeCompare(right.sectionId);
  });
}
