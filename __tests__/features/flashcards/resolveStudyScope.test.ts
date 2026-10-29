import type { Card } from '../../../src/features/flashcards/domain/card';
import {
  listStudySections,
  materialSetStudyCards,
  resolveStudyScope,
  studySessionKey,
} from '../../../src/features/flashcards/domain/resolveStudyScope';
import { filterCardsByCategory } from '../../../src/features/flashcards/utils/filterCardsByCategory';
import type { CurriculumSection } from '../../../src/features/season/domain/curriculumSection';
import { officialAnnotation, officialStudyCard } from '../../../test-utils/officialFlashcardFixtures';

function card(cardId: string, cardNumber: number, materialSetId = 'material-set-a'): Card {
  return officialStudyCard({
    cardId,
    cardNumber,
    materialSetId,
    seasonId: 'season-study',
    reference: `Ref ${cardId}`,
    verseText: `${cardId} verse.`,
    annotations: [
      officialAnnotation({
        cardId,
        annotationId: `${cardId}-beg`,
        type: 'uniqueBeginning',
        start: 0,
        end: cardId.length,
      }),
    ],
  });
}

function section(
  sectionId: string,
  displayOrder: number,
  cardIds: readonly string[],
  title = sectionId,
): CurriculumSection {
  return {
    seasonId: 'season-study',
    materialSetId: 'material-set-a',
    sectionId,
    title,
    displayOrder,
    cardIds,
  };
}

describe('resolveStudyScope', () => {
  const helmet = card('helmet-card', 2);
  const belt = card('belt-card', 1);
  const otherSet = card('other-card', 9, 'material-set-b');
  const curriculum = {
    seasonId: 'season-study',
    materialSetId: 'material-set-a',
    title: 'Junior',
    cards: [helmet, belt, otherSet],
    sections: [
      section('belt', 2, ['belt-card', 'missing-card'], 'The Belt of Truth'),
      section('helmet', 1, ['helmet-card'], 'Helmet of Salvation'),
      section('empty', 3, [], 'Shield of Faith'),
      {
        ...section('foreign', 0, ['other-card'], 'Other set'),
        materialSetId: 'material-set-b',
      },
    ],
  };

  it('studies the MaterialSet in curriculum order and omits other sets', () => {
    expect(materialSetStudyCards(curriculum).map((item) => item.cardId)).toEqual([
      'helmet-card',
      'belt-card',
    ]);
    const scope = resolveStudyScope(curriculum);
    expect(scope.status).toBe('ready');
    if (scope.status === 'ready') {
      expect(scope.title).toBe('Junior');
      expect(scope.cards.map((item) => item.cardId)).toEqual(['helmet-card', 'belt-card']);
      expect(scope.cards[0]).toBe(helmet);
    }
  });

  it('orders sections by display order and counts only resolved cards', () => {
    expect(listStudySections(curriculum).map((item) => [item.section.title, item.cardCount])).toEqual([
      ['Helmet of Salvation', 1],
      ['The Belt of Truth', 1],
      ['Shield of Faith', 0],
    ]);
  });

  it('follows section membership order and keeps category filters inside that section', () => {
    const scope = resolveStudyScope(curriculum, 'belt');
    expect(scope.status).toBe('ready');
    if (scope.status !== 'ready') {
      return;
    }
    expect(scope.title).toBe('The Belt of Truth');
    expect(scope.cards.map((item) => item.cardId)).toEqual(['belt-card']);
    expect(scope.cards[0]).toBe(belt);

    const filtered = filterCardsByCategory(scope.cards, ['uniqueBeginning'], 'official');
    expect(filtered.map((item) => item.cardId)).toEqual(['belt-card']);
    expect(filterCardsByCategory(scope.cards, [], 'official')).toEqual(scope.cards);
    expect(filtered.some((item) => item.cardId === 'helmet-card')).toBe(false);
  });

  it('rejects an unknown section and keeps an empty section empty', () => {
    expect(resolveStudyScope(curriculum, 'does-not-exist')).toEqual({
      status: 'unknown-section',
    });
    expect(resolveStudyScope(curriculum, 'foreign').status).toBe('unknown-section');
    const empty = resolveStudyScope(curriculum, 'empty');
    expect(empty.status).toBe('empty-section');
    if (empty.status === 'empty-section') {
      expect(empty.section.title).toBe('Shield of Faith');
    }
  });

  it('changes the session key when the section changes', () => {
    expect(studySessionKey('season-study', 'material-set-a', undefined)).toBe(
      'season-study:material-set-a:all',
    );
    expect(studySessionKey('season-study', 'material-set-a', 'helmet')).not.toBe(
      studySessionKey('season-study', 'material-set-a', 'belt'),
    );
  });
});
