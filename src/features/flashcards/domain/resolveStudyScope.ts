import type { CurriculumSection } from '../../season/domain/curriculumSection';
import { sortCurriculumSections } from '../../season/domain/curriculumSection';
import type { Card } from '../domain/card';
import type { StudyCurriculum } from '../repositories/curriculumRepository';

export interface StudySectionSummary {
  section: CurriculumSection;
  cardCount: number;
}

export type ResolvedStudyScope =
  | { status: 'ready'; title: string; cards: Card[]; section?: CurriculumSection }
  | { status: 'unknown-section' }
  | { status: 'empty-section'; section: CurriculumSection };

function cardBelongsToCurriculum(curriculum: StudyCurriculum, card: Card): boolean {
  return card.seasonId === curriculum.seasonId && card.materialSetId === curriculum.materialSetId;
}

/** Cards for this Season and MaterialSet, in curriculum order. Other sets are omitted. */
export function materialSetStudyCards(curriculum: StudyCurriculum): Card[] {
  return curriculum.cards.filter((card) => cardBelongsToCurriculum(curriculum, card));
}

function cardsById(curriculum: StudyCurriculum): Map<string, Card> {
  const map = new Map<string, Card>();
  for (const card of materialSetStudyCards(curriculum)) {
    if (!map.has(card.cardId)) {
      map.set(card.cardId, card);
    }
  }
  return map;
}

/**
 * Section membership in `cardIds` order. Cards are the same objects as the
 * MaterialSet list. They are not copied. Ids that are not in this MaterialSet
 * are skipped.
 */
export function resolveSectionCards(
  curriculum: StudyCurriculum,
  section: CurriculumSection,
): Card[] {
  const byId = cardsById(curriculum);
  const resolved: Card[] = [];
  for (const cardId of section.cardIds) {
    const card = byId.get(cardId);
    if (card !== undefined) {
      resolved.push(card);
    }
  }
  return resolved;
}

function sectionBelongsToCurriculum(
  curriculum: StudyCurriculum,
  section: CurriculumSection,
): boolean {
  return (
    section.seasonId === curriculum.seasonId && section.materialSetId === curriculum.materialSetId
  );
}

/** Official sections for this MaterialSet, in display order, with resolved counts. */
export function listStudySections(curriculum: StudyCurriculum): StudySectionSummary[] {
  return sortCurriculumSections(
    curriculum.sections.filter((section) => sectionBelongsToCurriculum(curriculum, section)),
  ).map((section) => ({
    section,
    cardCount: resolveSectionCards(curriculum, section).length,
  }));
}

/**
 * MaterialSet scope, or one section of it.
 * An unknown section id does not fall back to the full MaterialSet.
 * An empty section stays empty.
 */
export function resolveStudyScope(
  curriculum: StudyCurriculum,
  sectionId?: string,
): ResolvedStudyScope {
  if (sectionId === undefined) {
    return {
      status: 'ready',
      title: curriculum.title,
      cards: materialSetStudyCards(curriculum),
    };
  }

  const section = curriculum.sections.find(
    (item) => item.sectionId === sectionId && sectionBelongsToCurriculum(curriculum, item),
  );
  if (section === undefined) {
    return { status: 'unknown-section' };
  }

  const cards = resolveSectionCards(curriculum, section);
  if (cards.length === 0) {
    return { status: 'empty-section', section };
  }

  return {
    status: 'ready',
    title: section.title,
    cards,
    section,
  };
}

/** Remounts the flashcard session when the Season, MaterialSet, or section changes. */
export function studySessionKey(
  seasonId: string,
  materialSetId: string,
  sectionId: string | undefined,
): string {
  return `${seasonId}:${materialSetId}:${sectionId ?? 'all'}`;
}
