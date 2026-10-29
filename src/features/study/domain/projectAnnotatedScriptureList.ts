import type { Card } from '../../flashcards/domain/card';
import type { StudyCurriculum } from '../../flashcards/repositories/curriculumRepository';
import {
  sortCurriculumSections,
  type CurriculumSection,
} from '../../season/domain/curriculumSection';

/**
 * Display structure for the Annotated Scripture List.
 * Sections point at the curriculum's existing Card objects. This is not a
 * second curriculum model and it does not copy verse text.
 */
export interface AnnotatedScriptureSection {
  readonly section: CurriculumSection;
  readonly cards: readonly Card[];
}

export type ScriptureListProblem =
  | 'foreign-card'
  | 'duplicate-card-id'
  | 'foreign-section'
  | 'duplicate-section-id'
  | 'unknown-card-id'
  | 'duplicate-membership'
  | 'missing-section'
  | 'section-mismatch'
  | 'incomplete-membership';

export type AnnotatedScriptureListProjection =
  | { readonly ok: true; readonly sections: readonly AnnotatedScriptureSection[] }
  | { readonly ok: false; readonly problem: ScriptureListProblem };

function fail(problem: ScriptureListProblem): AnnotatedScriptureListProjection {
  return { ok: false, problem };
}

function belongsToCurriculum(
  curriculum: StudyCurriculum,
  record: { seasonId: string; materialSetId: string },
): boolean {
  return (
    record.seasonId === curriculum.seasonId && record.materialSetId === curriculum.materialSetId
  );
}

/**
 * Orders a validated StudyCurriculum for a virtualized section list.
 * Section order is authoritative displayOrder, then sectionId.
 * Card order is section.cardIds. Inputs are not mutated.
 * Inconsistent section membership fails closed instead of dropping verses
 * or inventing a section.
 */
export function projectAnnotatedScriptureList(
  curriculum: StudyCurriculum,
): AnnotatedScriptureListProjection {
  for (const card of curriculum.cards) {
    if (!belongsToCurriculum(curriculum, card)) {
      return fail('foreign-card');
    }
  }

  const cardsById = new Map<string, Card>();
  for (const card of curriculum.cards) {
    if (cardsById.has(card.cardId)) {
      return fail('duplicate-card-id');
    }
    cardsById.set(card.cardId, card);
  }

  const sectionIds = new Set<string>();
  for (const section of curriculum.sections) {
    if (!belongsToCurriculum(curriculum, section)) {
      return fail('foreign-section');
    }
    if (sectionIds.has(section.sectionId)) {
      return fail('duplicate-section-id');
    }
    sectionIds.add(section.sectionId);
  }

  const orderedSections = sortCurriculumSections(curriculum.sections);
  const built: AnnotatedScriptureSection[] = [];
  const placedSectionByCardId = new Map<string, string>();

  for (const section of orderedSections) {
    const cards: Card[] = [];
    const seenInSection = new Set<string>();
    for (const cardId of section.cardIds) {
      if (seenInSection.has(cardId) || placedSectionByCardId.has(cardId)) {
        return fail('duplicate-membership');
      }
      seenInSection.add(cardId);
      const card = cardsById.get(cardId);
      if (card === undefined) {
        return fail('unknown-card-id');
      }
      placedSectionByCardId.set(cardId, section.sectionId);
      cards.push(card);
    }
    built.push({ section, cards });
  }

  for (const card of cardsById.values()) {
    if (placedSectionByCardId.has(card.cardId)) {
      continue;
    }
    const declaredSection = card.sectionId;
    if (
      declaredSection === undefined ||
      declaredSection.length === 0 ||
      !sectionIds.has(declaredSection)
    ) {
      return fail('missing-section');
    }
    return fail('incomplete-membership');
  }

  for (const [cardId, sectionId] of placedSectionByCardId) {
    const card = cardsById.get(cardId);
    if (card === undefined) {
      return fail('unknown-card-id');
    }
    if (card.sectionId === sectionId) {
      continue;
    }
    const declaredSection = card.sectionId;
    if (
      declaredSection === undefined ||
      declaredSection.length === 0 ||
      !sectionIds.has(declaredSection)
    ) {
      return fail('missing-section');
    }
    return fail('section-mismatch');
  }

  return { ok: true, sections: built };
}
