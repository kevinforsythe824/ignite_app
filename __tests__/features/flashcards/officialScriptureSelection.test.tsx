import { act, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { Card } from '../../../src/features/flashcards/domain/card';
import {
  useFlashcardSessionActions,
} from '../../../src/features/flashcards/state/FlashcardSessionContext';
import { FlashcardSessionProvider } from '../../../src/features/flashcards/state/FlashcardSessionContext';
import { getVerseSegments } from '../../../src/features/flashcards/utils/getVerseSegments';
import FlashcardStudyScreen from '../../../src/screens/FlashcardStudyScreen';
import { FREQUENCY_SUPERSCRIPT_GLYPH } from '../../../src/shared/scripture';
import type { ScripturePresentationMode } from '../../../src/features/flashcards/scripturePresentation';
import {
  LEGACY_UNIQUE_BEGINNING,
  OFFICIAL_FLASHCARD_MATERIAL_SET_A,
  OFFICIAL_FLASHCARD_MATERIAL_SET_B,
  OFFICIAL_FLASHCARD_SEASON_ID,
  officialAnnotation,
  officialStudyCard,
} from '../../../test-utils/officialFlashcardFixtures';

jest.mock('../../../src/features/flashcards/utils/getVerseSegments', () => {
  const actual = jest.requireActual(
    '../../../src/features/flashcards/utils/getVerseSegments',
  ) as typeof import('../../../src/features/flashcards/utils/getVerseSegments');
  return {
    ...actual,
    getVerseSegments: jest.fn((card: Card) => actual.getVerseSegments(card)),
  };
});

const HIDDEN = { includeHiddenElements: true } as const;
const BOTH_VERSE = 'Alpha walks.';

const sessionControls: {
  goToNext: () => void;
  goToPrevious: () => void;
  toggleCategoryFilter: (filterId: 'uniqueBeginning') => void;
} = {
  goToNext: () => {
    throw new Error('Study session is not mounted');
  },
  goToPrevious: () => {
    throw new Error('Study session is not mounted');
  },
  toggleCategoryFilter: () => {
    throw new Error('Study session is not mounted');
  },
};

function SessionControls(): null {
  const { goToNext, goToPrevious, toggleCategoryFilter } = useFlashcardSessionActions();
  sessionControls.goToNext = goToNext;
  sessionControls.goToPrevious = goToPrevious;
  sessionControls.toggleCategoryFilter = toggleCategoryFilter;
  return null;
}

function bothMetadataCard(cardId = 'card-both'): Card {
  return officialStudyCard({
    cardId,
    reference: 'John 11:35',
    verseText: BOTH_VERSE,
    indexCode: 'QX',
    matchedRules: [LEGACY_UNIQUE_BEGINNING],
    annotations: [
      officialAnnotation({
        cardId,
        annotationId: 'freq-walks',
        type: 'frequency',
        start: 6,
        end: 11,
        frequencyTier: 3,
      }),
    ],
  });
}

async function renderStudy(
  cards: readonly Card[],
  scripturePresentation?: ScripturePresentationMode,
): Promise<ReturnType<typeof render>> {
  return render(
    <FlashcardSessionProvider
      seasonId={cards[0]?.seasonId ?? OFFICIAL_FLASHCARD_SEASON_ID}
      title="Study"
      cards={cards}
      scripturePresentation={scripturePresentation}
    >
      <SessionControls />
      <FlashcardStudyScreen />
    </FlashcardSessionProvider>,
  );
}

function expectOfficialOnly(): void {
  expect(screen.getAllByTestId('official-scripture-text')).toHaveLength(1);
  expect(screen.queryByTestId('rich-verse-text')).toBeNull();
}

function expectLegacyOnly(): void {
  expect(screen.getAllByTestId('rich-verse-text')).toHaveLength(1);
  expect(screen.queryByTestId('official-scripture-text')).toBeNull();
}

function indicatorGlyphs(): string[] {
  return screen
    .queryAllByTestId('scripture-frequency-indicator', HIDDEN)
    .map((node) => String(node.props.children));
}

describe('official scripture selection', () => {
  beforeEach(() => {
    jest.mocked(getVerseSegments).mockClear();
    sessionControls.goToNext = () => {
      throw new Error('Study session is not mounted');
    };
    sessionControls.goToPrevious = () => {
      throw new Error('Study session is not mounted');
    };
    sessionControls.toggleCategoryFilter = () => {
      throw new Error('Study session is not mounted');
    };
  });

  it('renders OfficialScriptureText for official cards and does not parse matchedRules', async () => {
    await renderStudy([bothMetadataCard()], 'official');

    expectOfficialOnly();
    expect(screen.getByLabelText(BOTH_VERSE).props.accessibilityLabel).toBe(BOTH_VERSE);
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[3]]);
    expect(screen.queryByText('/')).toBeNull();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('flashcard-locate-face')).getByText('(QX)')).toBeTruthy();
    expect(within(screen.getByTestId('flashcard-quote-face')).getByText('John 11:35')).toBeTruthy();
  });

  it('keeps an official card on OfficialScriptureText when annotations are empty', async () => {
    const card = officialStudyCard({
      cardId: 'card-plain',
      reference: 'John 11:35',
      verseText: BOTH_VERSE,
      matchedRules: [LEGACY_UNIQUE_BEGINNING],
      annotations: [],
    });

    await renderStudy([card], 'official');

    expectOfficialOnly();
    expect(screen.getByLabelText(BOTH_VERSE)).toBeTruthy();
    expect(indicatorGlyphs()).toEqual([]);
    expect(screen.queryByText('/')).toBeNull();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('renders RichVerseText for legacy cards, including empty annotations', async () => {
    const card = officialStudyCard({
      cardId: 'card-legacy',
      reference: 'John 11:35',
      verseText: BOTH_VERSE,
      matchedRules: [LEGACY_UNIQUE_BEGINNING],
      annotations: [],
    });

    await renderStudy([card]);

    expectLegacyOnly();
    expect(screen.getByText('/')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(indicatorGlyphs()).toEqual([]);
    expect(jest.mocked(getVerseSegments)).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('flashcard-quote-face')).toBeTruthy();
    expect(within(screen.getByTestId('flashcard-quote-face')).getByText('John 11:35')).toBeTruthy();
  });

  it('follows legacy mode when the card also carries official annotations', async () => {
    await renderStudy([bothMetadataCard()], 'legacy');

    expectLegacyOnly();
    expect(screen.getByText('/')).toBeTruthy();
    expect(indicatorGlyphs()).toEqual([]);
    expect(jest.mocked(getVerseSegments)).toHaveBeenCalled();
  });

  it('switches renderers with the trusted mode and does not keep superscripts', async () => {
    const view = await renderStudy([bothMetadataCard()], 'official');
    expectOfficialOnly();
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[3]]);
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();

    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[bothMetadataCard()]}
        scripturePresentation="legacy"
      >
        <SessionControls />
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expectLegacyOnly();
    expect(screen.getByText('/')).toBeTruthy();
    expect(indicatorGlyphs()).toEqual([]);
    expect(jest.mocked(getVerseSegments)).toHaveBeenCalled();

    jest.mocked(getVerseSegments).mockClear();
    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[bothMetadataCard()]}
        scripturePresentation="official"
      >
        <SessionControls />
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expectOfficialOnly();
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[3]]);
    expect(screen.queryByText('/')).toBeNull();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('places the verse on the Locate face and the reference on the Quote face', async () => {
    await renderStudy([bothMetadataCard()], 'official');

    const locate = screen.getByTestId('flashcard-locate-face');
    const quote = screen.getByTestId('flashcard-quote-face');
    expect(within(locate).getByTestId('official-scripture-text').props.accessibilityLabel).toBe(BOTH_VERSE);
    expect(within(locate).queryByText('John 11:35')).toBeNull();
    expect(within(quote).getByText('John 11:35')).toBeTruthy();
    expect(within(quote).queryByTestId('official-scripture-text')).toBeNull();
    expect(StyleSheet.flatten(locate.props.style).opacity).toBe(1);
    expect(StyleSheet.flatten(quote.props.style).opacity).toBe(0);
  });
});

describe('official scripture material-set isolation', () => {
  beforeEach(() => {
    jest.mocked(getVerseSegments).mockClear();
  });

  it('does not keep superscripts when the same reference moves between material sets', async () => {
    const sharedReference = 'John 11:35';
    const first = officialStudyCard({
      cardId: 'card-set-a',
      materialSetId: OFFICIAL_FLASHCARD_MATERIAL_SET_A,
      reference: sharedReference,
      verseText: 'Hope remains.',
      annotations: [
        officialAnnotation({
          cardId: 'card-set-a',
          annotationId: 'tier-one',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 1,
        }),
      ],
    });
    const second = officialStudyCard({
      cardId: 'card-set-b',
      cardNumber: 2,
      materialSetId: OFFICIAL_FLASHCARD_MATERIAL_SET_B,
      reference: sharedReference,
      verseText: 'Hope remains.',
      annotations: [
        officialAnnotation({
          cardId: 'card-set-b',
          annotationId: 'tier-two',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 2,
        }),
      ],
    });

    await renderStudy([first, second], 'official');
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[1]]);

    await act(async () => {
      sessionControls.goToNext();
    });

    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[2]]);
    expect(screen.getByLabelText('Hope remains.')).toBeTruthy();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();

    await act(async () => {
      sessionControls.goToPrevious();
    });

    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[1]]);
  });

  it('replaces superscripts when the same card id arrives from another material set', async () => {
    const verse = 'Hope remains.';
    const first = officialStudyCard({
      cardId: 'shared-card',
      materialSetId: OFFICIAL_FLASHCARD_MATERIAL_SET_A,
      reference: 'John 11:35',
      verseText: verse,
      annotations: [
        officialAnnotation({
          cardId: 'shared-card',
          annotationId: 'from-a',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 5,
        }),
      ],
    });
    const second = officialStudyCard({
      cardId: 'shared-card',
      materialSetId: OFFICIAL_FLASHCARD_MATERIAL_SET_B,
      reference: 'John 11:35',
      verseText: verse,
      annotations: [],
    });

    const view = await renderStudy([first], 'official');
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[5]]);

    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[second]}
        scripturePresentation="official"
      >
        <SessionControls />
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expectOfficialOnly();
    expect(indicatorGlyphs()).toEqual([]);
    expect(screen.getByLabelText(verse)).toBeTruthy();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('filters official cards by category without leaving the hidden card superscript', async () => {
    const kept = officialStudyCard({
      cardId: 'kept',
      reference: 'John 1:1',
      verseText: 'Kept words.',
      annotations: [
        officialAnnotation({
          cardId: 'kept',
          annotationId: 'kept-beg',
          type: 'uniqueBeginning',
          start: 0,
          end: 4,
        }),
      ],
    });
    const hidden = officialStudyCard({
      cardId: 'hidden',
      cardNumber: 2,
      reference: 'John 1:2',
      verseText: 'Hidden hope.',
      annotations: [
        officialAnnotation({
          cardId: 'hidden',
          annotationId: 'hope',
          type: 'frequency',
          start: 7,
          end: 11,
          frequencyTier: 5,
        }),
      ],
    });

    await renderStudy([kept, hidden], 'official');
    expect(screen.getByLabelText('Kept words.')).toBeTruthy();

    await act(async () => {
      sessionControls.goToNext();
    });
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[5]]);

    await act(async () => {
      sessionControls.toggleCategoryFilter('uniqueBeginning');
    });

    expect(screen.getByLabelText('Kept words.')).toBeTruthy();
    expect(screen.queryByLabelText('Hidden hope.')).toBeNull();
    expect(indicatorGlyphs()).toEqual([]);
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('drops official superscripts when that card switches to legacy presentation', async () => {
    const card = bothMetadataCard('shared-card');
    const view = await renderStudy([card], 'official');
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[3]]);

    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[card]}
        scripturePresentation="legacy"
      >
        <SessionControls />
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expectLegacyOnly();
    expect(indicatorGlyphs()).toEqual([]);
    expect(screen.getByText('/')).toBeTruthy();
  });
});
