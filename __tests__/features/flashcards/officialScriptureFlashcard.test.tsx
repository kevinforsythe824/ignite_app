import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, StyleSheet, type TextStyle } from 'react-native';

import type { Card } from '../../../src/features/flashcards/domain/card';
import { FlashcardSessionProvider } from '../../../src/features/flashcards/state/FlashcardSessionContext';
import { getVerseSegments } from '../../../src/features/flashcards/utils/getVerseSegments';
import FlashcardStudyScreen from '../../../src/screens/FlashcardStudyScreen';
import { FREQUENCY_SUPERSCRIPT_GLYPH } from '../../../src/shared/scripture';
import { colors, fonts } from '../../../src/shared/theme';
import { contrastRatio } from '../../../test-utils/relativeLuminanceContrast';
import {
  OFFICIAL_FLASHCARD_SEASON_ID,
  officialAnnotation,
  officialAnnotationWithTier,
  officialStudyCard,
} from '../../../test-utils/officialFlashcardFixtures';

jest.mock('../../../src/features/flashcards/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('../../../src/features/flashcards/utils/getVerseSegments', () => {
  const actual = jest.requireActual(
    '../../../src/features/flashcards/utils/getVerseSegments',
  ) as typeof import('../../../src/features/flashcards/utils/getVerseSegments');
  return {
    ...actual,
    getVerseSegments: jest.fn((card: Card) => actual.getVerseSegments(card)),
  };
});

interface MockFlyOff {
  target: number;
  finish: (finished?: boolean) => void;
}

const mockFlyOffs: MockFlyOff[] = [];

jest.mock('react-native-reanimated', () => {
  const { View: AnimatedView } = require('react-native');

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (updater: () => object) => updater(),
    withTiming: (
      value: number,
      _config?: { duration?: number; easing?: unknown },
      callback?: (finished?: boolean) => void,
    ) => {
      if (typeof callback === 'function') {
        mockFlyOffs.push({ target: value, finish: callback });
      }
      return value;
    },
    withSpring: (value: number) => value,
    interpolate: (_value: number, _inputRange: number[], outputRange: number[]) => outputRange[0],
    Extrapolation: { CLAMP: 'clamp' },
    Easing: {
      inOut: (fn: unknown) => ({ curve: 'inOut', fn }),
      in: (fn: unknown) => ({ curve: 'in', fn }),
      out: (fn: unknown) => ({ curve: 'out', fn }),
      cubic: 'cubic',
      quad: 'quad',
      bezier: () => (value: unknown) => value,
    },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    runOnUI: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

const HIDDEN = { includeHiddenElements: true } as const;
const FLY_OFF_DISTANCE = Dimensions.get('window').width * 1.5;

async function renderOfficial(cards: readonly Card[]): Promise<ReturnType<typeof render>> {
  return render(
    <FlashcardSessionProvider
      seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
      title="Study"
      cards={cards}
      scripturePresentation="official"
    >
      <FlashcardStudyScreen />
    </FlashcardSessionProvider>,
  );
}

function flatten(style: unknown): TextStyle {
  return StyleSheet.flatten(style) as TextStyle;
}

function runNodes() {
  return screen.getAllByTestId('scripture-run');
}

function runText(): string {
  return runNodes()
    .map((node) => String(node.props.children))
    .join('');
}

function runWithText(text: string) {
  const match = runNodes().find((node) => node.props.children === text);
  if (match === undefined) {
    throw new Error(`no scripture run matched "${text}"`);
  }
  return match;
}

function indicatorGlyphs(): string[] {
  return screen
    .getAllByTestId('scripture-frequency-indicator', HIDDEN)
    .map((node) => String(node.props.children));
}

async function finishFlyOff(index = 0): Promise<void> {
  await act(async () => {
    mockFlyOffs[index]?.finish(true);
  });
}

describe('official flashcard scripture', () => {
  beforeEach(() => {
    mockFlyOffs.length = 0;
    jest.mocked(getVerseSegments).mockClear();
  });

  it('bolds a unique beginning, underlines a unique ending, and keeps one superscript', async () => {
    const verse = 'Alpha walks.';
    const card = officialStudyCard({
      cardId: 'marks',
      reference: 'Mark 1:1',
      verseText: verse,
      indexCode: 'IDX',
      annotations: [
        officialAnnotation({
          cardId: 'marks',
          annotationId: 'begin',
          type: 'uniqueBeginning',
          start: 0,
          end: 5,
        }),
        officialAnnotation({
          cardId: 'marks',
          annotationId: 'end',
          type: 'uniqueEnding',
          start: 6,
          end: 11,
        }),
        officialAnnotation({
          cardId: 'marks',
          annotationId: 'freq',
          type: 'frequency',
          start: 6,
          end: 11,
          frequencyTier: 4,
        }),
      ],
    });

    await renderOfficial([card]);

    expect(flatten(runWithText('Alpha').props.style).fontWeight).toBe('700');
    expect(flatten(runWithText('Alpha').props.style).fontFamily).toBe(fonts.bold);
    expect(flatten(runWithText('walks').props.style).textDecorationLine).toBe('underline');
    expect(flatten(runWithText('walks').props.style).color).toBe(colors.officialFrequency4);
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[4]]);
    expect(runText()).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expect(screen.getByText('(IDX)')).toBeTruthy();
    expect(within(screen.getByTestId('flashcard-quote-face')).getByText('Mark 1:1')).toBeTruthy();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('colors a frequency inside a beginning and inside an ending', async () => {
    const verse = 'Alpha walks.';
    const card = officialStudyCard({
      cardId: 'inside',
      reference: 'Mark 1:2',
      verseText: verse,
      annotations: [
        officialAnnotation({
          cardId: 'inside',
          annotationId: 'begin',
          type: 'uniqueBeginning',
          start: 0,
          end: 5,
        }),
        officialAnnotation({
          cardId: 'inside',
          annotationId: 'freq-begin',
          type: 'frequency',
          start: 0,
          end: 5,
          frequencyTier: 1,
        }),
        officialAnnotation({
          cardId: 'inside',
          annotationId: 'end',
          type: 'uniqueEnding',
          start: 6,
          end: 11,
        }),
        officialAnnotation({
          cardId: 'inside',
          annotationId: 'freq-end',
          type: 'frequency',
          start: 6,
          end: 11,
          frequencyTier: 2,
        }),
      ],
    });

    await renderOfficial([card]);

    const beginning = flatten(runWithText('Alpha').props.style);
    const ending = flatten(runWithText('walks').props.style);
    expect(beginning.fontWeight).toBe('700');
    expect(beginning.color).toBe(colors.officialFrequency1);
    expect(ending.textDecorationLine).toBe('underline');
    expect(ending.color).toBe(colors.officialFrequency2);
    expect(indicatorGlyphs()).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
      FREQUENCY_SUPERSCRIPT_GLYPH[2],
    ]);
    expect(runText()).toBe(verse);
  });

  it('composes bold, underline, and tier color on one overlapping run', async () => {
    const verse = 'Alpha.';
    const card = officialStudyCard({
      cardId: 'overlap',
      reference: 'Mark 1:3',
      verseText: verse,
      annotations: [
        officialAnnotation({
          cardId: 'overlap',
          annotationId: 'begin',
          type: 'uniqueBeginning',
          start: 0,
          end: 5,
        }),
        officialAnnotation({
          cardId: 'overlap',
          annotationId: 'end',
          type: 'uniqueEnding',
          start: 0,
          end: 5,
        }),
        officialAnnotation({
          cardId: 'overlap',
          annotationId: 'freq',
          type: 'frequency',
          start: 0,
          end: 5,
          frequencyTier: 3,
        }),
      ],
    });

    await renderOfficial([card]);

    const word = flatten(runWithText('Alpha').props.style);
    expect(word.fontWeight).toBe('700');
    expect(word.textDecorationLine).toBe('underline');
    expect(word.color).toBe(colors.officialFrequency3);
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[3]]);
    expect(runText()).toBe(verse);
  });

  it('renders tiers 1 through 5 with the official colors and one superscript each', async () => {
    const verse = 'one two three four five';
    const spans = [
      { word: 'one', start: 0, end: 3, tier: 1 },
      { word: 'two', start: 4, end: 7, tier: 2 },
      { word: 'three', start: 8, end: 13, tier: 3 },
      { word: 'four', start: 14, end: 18, tier: 4 },
      { word: 'five', start: 19, end: 23, tier: 5 },
    ] as const;
    const tierColor = {
      1: colors.officialFrequency1,
      2: colors.officialFrequency2,
      3: colors.officialFrequency3,
      4: colors.officialFrequency4,
      5: colors.officialFrequency5,
    } as const;

    await renderOfficial([
      officialStudyCard({
        cardId: 'tiers',
        reference: 'Mark 1:4',
        verseText: verse,
        annotations: spans.map((span) =>
          officialAnnotation({
            cardId: 'tiers',
            annotationId: `tier-${span.tier}`,
            type: 'frequency',
            start: span.start,
            end: span.end,
            frequencyTier: span.tier,
          }),
        ),
      }),
    ]);

    for (const span of spans) {
      expect(flatten(runWithText(span.word).props.style).color).toBe(tierColor[span.tier]);
    }
    expect(indicatorGlyphs()).toEqual(spans.map((span) => FREQUENCY_SUPERSCRIPT_GLYPH[span.tier]));
    expect(runText()).toBe(verse);
    expect(flatten(runWithText('three').props.style).color).toBe('#BE5A0A');
  });

  it('keeps a repeated phrase as two frequencies without changing the verse', async () => {
    const verse = 'hope and hope';
    await renderOfficial([
      officialStudyCard({
        cardId: 'repeat',
        reference: 'Mark 1:5',
        verseText: verse,
        annotations: [
          officialAnnotation({
            cardId: 'repeat',
            annotationId: 'first-hope',
            type: 'frequency',
            start: 0,
            end: 4,
            frequencyTier: 2,
          }),
          officialAnnotation({
            cardId: 'repeat',
            annotationId: 'second-hope',
            type: 'frequency',
            start: 9,
            end: 13,
            frequencyTier: 2,
          }),
        ],
      }),
    ]);

    expect(indicatorGlyphs()).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[2],
      FREQUENCY_SUPERSCRIPT_GLYPH[2],
    ]);
    expect(runText()).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
  });

  it('keeps leading punctuation in the canonical verse', async () => {
    const verse = '(Hello) there.';
    await renderOfficial([
      officialStudyCard({
        cardId: 'punct',
        reference: 'Mark 1:6',
        verseText: verse,
        annotations: [
          officialAnnotation({
            cardId: 'punct',
            annotationId: 'begin',
            type: 'uniqueBeginning',
            start: 1,
            end: 6,
          }),
        ],
      }),
    ]);

    expect(flatten(runWithText('Hello').props.style).fontWeight).toBe('700');
    expect(runText()).toBe(verse);
    expect(runText().startsWith('(')).toBe(true);
  });

  it('leaves the index code off cards that do not have one', async () => {
    await renderOfficial([
      officialStudyCard({
        cardId: 'no-index',
        reference: 'Mark 1:7',
        verseText: 'Plain words.',
        annotations: [
          officialAnnotation({
            cardId: 'no-index',
            annotationId: 'freq',
            type: 'frequency',
            start: 0,
            end: 5,
            frequencyTier: 1,
          }),
        ],
      }),
    ]);

    expect(screen.queryByText(/\(/)).toBeNull();
    expect(screen.getByLabelText('Plain words.').props.accessibilityLabel).toBe('Plain words.');
  });

  it('updates superscripts when official annotations change', async () => {
    const verse = 'Hope remains.';
    const first = officialStudyCard({
      cardId: 'updates',
      reference: 'Mark 1:8',
      verseText: verse,
      annotations: [
        officialAnnotation({
          cardId: 'updates',
          annotationId: 'freq',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 1,
        }),
      ],
    });
    const second = officialStudyCard({
      ...first,
      annotations: [
        officialAnnotation({
          cardId: 'updates',
          annotationId: 'freq',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 5,
        }),
      ],
    });

    const view = await renderOfficial([first]);
    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[1]]);

    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[second]}
        scripturePresentation="official"
      >
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[5]]);
    expect(runText()).toBe(verse);
  });
});

describe('official flashcard session behavior', () => {
  beforeEach(() => {
    mockFlyOffs.length = 0;
  });

  function studyCards(): Card[] {
    return [
      officialStudyCard({
        cardId: 's1',
        cardNumber: 1,
        reference: 'Test 1:1',
        verseText: 'First verse.',
        tags: ['Unique Beg.'],
      }),
      officialStudyCard({
        cardId: 's2',
        cardNumber: 2,
        reference: 'Test 1:2',
        verseText: 'Second verse.',
      }),
    ];
  }

  it('scores one correct answer after the fly-off and returns to the previous card', async () => {
    await renderOfficial(studyCards());
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Mark as correct'));
    await user.press(screen.getByLabelText('Mark as correct'));
    await user.press(screen.getByLabelText('Mark as needs work'));

    expect(mockFlyOffs).toHaveLength(1);
    expect(mockFlyOffs[0]?.target).toBe(FLY_OFF_DISTANCE);
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expect(screen.getByLabelText('First verse.')).toBeTruthy();

    await finishFlyOff();

    expect(screen.getByLabelText('Second verse.')).toBeTruthy();
    expect(screen.queryByLabelText('First verse.')).toBeNull();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();

    await user.press(screen.getByLabelText('Previous card'));

    expect(screen.getByLabelText('First verse.')).toBeTruthy();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();
  });

  it('completes the session from official cards without a second score', async () => {
    await renderOfficial(studyCards());
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Mark as needs work'));
    expect(mockFlyOffs[0]?.target).toBe(-FLY_OFF_DISTANCE);
    await finishFlyOff();
    expect(screen.getByLabelText('1 needs work')).toBeTruthy();

    await user.press(screen.getByLabelText('Mark as correct'));
    await finishFlyOff(1);

    expect(screen.getByText('Study complete')).toBeTruthy();
    expect(screen.getByText('1 correct · 1 needs work · 2 cards')).toBeTruthy();
    expect(screen.queryByTestId('official-scripture-text')).toBeNull();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('1 needs work')).toBeTruthy();
  });
});

describe('official flashcard annotation recovery', () => {
  beforeEach(() => {
    jest.mocked(getVerseSegments).mockClear();
  });

  it('keeps the verse when annotations are malformed, unsupported, or missing a tier', async () => {
    const verse = 'Alpha walks.';
    const card = officialStudyCard({
      cardId: 'recover',
      reference: 'Mark 2:1',
      verseText: verse,
      annotations: [
        null,
        { type: 'not-a-mark', resolvedTarget: { start: 0, end: 5 } },
        officialAnnotation({
          cardId: 'recover',
          annotationId: 'missing-tier',
          type: 'frequency',
          start: 0,
          end: 5,
        }),
        officialAnnotationWithTier(
          {
            cardId: 'recover',
            annotationId: 'bad-tier',
            type: 'frequency',
            start: 6,
            end: 11,
          },
          9,
        ),
      ] as Card['annotations'],
    });

    await renderOfficial([card]);

    expect(screen.getByLabelText(verse)).toBeTruthy();
    expect(runText()).toBe(verse);
    expect(screen.queryByTestId('scripture-frequency-indicator', HIDDEN)).toBeNull();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });

  it('recovers a distinct frequency when another id is duplicated', async () => {
    const verse = 'abcdefgh';
    await renderOfficial([
      officialStudyCard({
        cardId: 'dups',
        reference: 'Mark 2:2',
        verseText: verse,
        annotations: [
          officialAnnotation({
            cardId: 'dups',
            annotationId: 'same',
            type: 'frequency',
            start: 0,
            end: 4,
            frequencyTier: 1,
          }),
          officialAnnotation({
            cardId: 'dups',
            annotationId: 'same',
            type: 'frequency',
            start: 0,
            end: 4,
            frequencyTier: 1,
          }),
          officialAnnotation({
            cardId: 'dups',
            annotationId: 'kept',
            type: 'frequency',
            start: 2,
            end: 6,
            frequencyTier: 2,
          }),
        ],
      }),
    ]);

    expect(indicatorGlyphs()).toEqual([FREQUENCY_SUPERSCRIPT_GLYPH[2]]);
    expect(runText()).toBe(verse);
    expect(flatten(runWithText('cdef').props.style).color).toBe(colors.officialFrequency2);
  });

  it('keeps distinct same-tier overlaps and drops conflicting tiers without crashing', async () => {
    const overlap = 'abcdef';
    const view = await renderOfficial([
      officialStudyCard({
        cardId: 'same-tier',
        reference: 'Mark 2:3',
        verseText: overlap,
        annotations: [
          officialAnnotation({
            cardId: 'same-tier',
            annotationId: 'left',
            type: 'frequency',
            start: 0,
            end: 4,
            frequencyTier: 1,
          }),
          officialAnnotation({
            cardId: 'same-tier',
            annotationId: 'right',
            type: 'frequency',
            start: 2,
            end: 6,
            frequencyTier: 1,
          }),
        ],
      }),
    ]);

    expect(indicatorGlyphs()).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
    ]);
    expect(runText()).toBe(overlap);

    const conflict = 'zzzzzz';
    await view.rerender(
      <FlashcardSessionProvider
        seasonId={OFFICIAL_FLASHCARD_SEASON_ID}
        title="Study"
        cards={[
          officialStudyCard({
            cardId: 'conflict',
            reference: 'Mark 2:4',
            verseText: conflict,
            annotations: [
              officialAnnotation({
                cardId: 'conflict',
                annotationId: 'low',
                type: 'frequency',
                start: 0,
                end: 4,
                frequencyTier: 1,
              }),
              officialAnnotation({
                cardId: 'conflict',
                annotationId: 'high',
                type: 'frequency',
                start: 2,
                end: 6,
                frequencyTier: 4,
              }),
            ],
          }),
        ]}
        scripturePresentation="official"
      >
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>,
    );

    expect(screen.getByLabelText(conflict)).toBeTruthy();
    expect(runText()).toBe(conflict);
    expect(screen.queryByTestId('scripture-frequency-indicator', HIDDEN)).toBeNull();
    expect(jest.mocked(getVerseSegments)).not.toHaveBeenCalled();
  });
});

describe('official flashcard accessibility', () => {
  const longVerse = `${'In the beginning '.repeat(40)}the end.`;

  it('exposes the canonical verse once and hides frequency superscripts', async () => {
    const verse = 'Alpha walks.';
    await renderOfficial([
      officialStudyCard({
        cardId: 'access',
        reference: 'John 11:35',
        verseText: verse,
        indexCode: 'QX',
        annotations: [
          officialAnnotation({
            cardId: 'access',
            annotationId: 'freq',
            type: 'frequency',
            start: 6,
            end: 11,
            frequencyTier: 3,
          }),
        ],
      }),
    ]);

    const labels = screen.getAllByLabelText(verse);
    expect(labels).toHaveLength(1);
    expect(labels[0]?.props.accessibilityLabel).toBe(verse);
    expect(labels[0]?.props.accessibilityLabel).not.toContain(FREQUENCY_SUPERSCRIPT_GLYPH[3]);

    const mark = screen.getByTestId('scripture-frequency-indicator', HIDDEN);
    expect(mark.props.accessible).toBe(false);
    expect(mark.props.importantForAccessibility).toBe('no');
    expect(mark.props.accessibilityElementsHidden).toBe(true);
    expect(mark.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[3]);

    const reference = within(screen.getByTestId('flashcard-quote-face')).getByText('John 11:35');
    expect(reference.props.accessible).not.toBe(false);
    expect(screen.getByText('(QX)')).toBeTruthy();
  });

  it('does not truncate a long verse or nest a scroll view', async () => {
    const view = await renderOfficial([
      officialStudyCard({
        cardId: 'long',
        reference: 'Psalm 119:1',
        verseText: longVerse,
      }),
    ]);

    const scripture = screen.getByTestId('official-scripture-text');
    expect(scripture.props.accessibilityLabel).toBe(longVerse);
    expect(scripture.props.numberOfLines).toBeUndefined();
    expect(scripture.props.ellipsizeMode).toBeUndefined();
    expect(scripture.props.allowFontScaling).not.toBe(false);
    expect(runText()).toBe(longVerse);
    expect(JSON.stringify(view.toJSON())).not.toMatch(/ScrollView/);
    for (const run of runNodes()) {
      expect(run.props.numberOfLines).toBeUndefined();
      expect(run.props.allowFontScaling).not.toBe(false);
    }
  });

  it('meets 4.5:1 for tier 3 against the Locate face background', async () => {
    await renderOfficial([
      officialStudyCard({
        cardId: 'contrast',
        reference: 'Mark 3:1',
        verseText: 'orange',
        annotations: [
          officialAnnotation({
            cardId: 'contrast',
            annotationId: 'tier-3',
            type: 'frequency',
            start: 0,
            end: 6,
            frequencyTier: 3,
          }),
        ],
      }),
    ]);

    const background = String(flatten(screen.getByTestId('flashcard-locate-face').props.style).backgroundColor);
    const tierColor = String(flatten(runWithText('orange').props.style).color);
    expect(background).toBe(colors.cardWhite);
    expect(tierColor).toBe(colors.officialFrequency3);
    expect(contrastRatio(tierColor, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tierColor, background)).toBeCloseTo(4.5100394190224895, 10);
  });
});
