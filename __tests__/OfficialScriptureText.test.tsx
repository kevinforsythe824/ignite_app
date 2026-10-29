import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';

import { OfficialScriptureText } from '../src/shared/scripture/OfficialScriptureText';
import { FREQUENCY_SUPERSCRIPT_GLYPH } from '../src/shared/scripture/officialFrequencyStyle';
import type { OfficialScriptureAnnotationInput } from '../src/shared/scripture/segmentOfficialAnnotations';
import { colors, fonts, typography } from '../src/shared/theme';

type Queries = Awaited<ReturnType<typeof render>>;

/** Superscripts are hidden from accessibility, so queries must opt in. */
const HIDDEN = { includeHiddenElements: true } as const;

function flatten(style: unknown): TextStyle {
  return StyleSheet.flatten(style) as TextStyle;
}

function indicators(screen: Queries) {
  return screen.getAllByTestId('scripture-frequency-indicator', HIDDEN);
}

function runWithText(screen: Queries, text: string) {
  const match = screen.getAllByTestId('scripture-run').find((node) => node.props.children === text);
  if (match === undefined) {
    throw new Error('no scripture run matched the requested text');
  }
  return match;
}

function childNodes(screen: Queries): Array<{ props: { testID?: string; children?: unknown; accessibilityLabel?: string } }> {
  const children = screen.getByTestId('official-scripture-text').props.children;
  if (children == null) {
    return [];
  }
  return Array.isArray(children) ? children.filter(Boolean) : [children];
}

function runText(screen: Queries): string {
  return screen
    .getAllByTestId('scripture-run')
    .map((node) => String(node.props.children))
    .join('');
}

describe('OfficialScriptureText', () => {
  it('renders plain punctuation and newlines as one canonical run', async () => {
    const verse = '(Hello)\nline two.';
    const screen = await render(<OfficialScriptureText verseText={verse} annotations={[]} />);

    expect(runText(screen)).toBe(verse);
    expect(screen.getByTestId('official-scripture-text').props.accessibilityLabel).toBe(verse);
    expect(flatten(runWithText(screen, verse).props.style).fontFamily).toBe(fonts.regular);
    expect(flatten(screen.getByTestId('official-scripture-text').props.style).fontFamily).toBe(fonts.regular);
    expect(flatten(screen.getByTestId('official-scripture-text').props.style).lineHeight).toBe(
      typography.verseBody.lineHeight,
    );
    expect(screen.queryByTestId('scripture-frequency-indicator', HIDDEN)).toBeNull();
  });

  it('composes bold, underline, and tier color on one run and places one superscript after it', async () => {
    const verse = 'word tail';
    const annotations: OfficialScriptureAnnotationInput[] = [
      { type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'word' } },
      { type: 'uniqueEnding', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'word' } },
      {
        annotationId: 'f4',
        type: 'frequency',
        frequencyTier: 4,
        resolvedTarget: { start: 0, end: 4 },
        sourceTarget: { phrase: 'word' },
      },
    ];
    const screen = await render(<OfficialScriptureText verseText={verse} annotations={annotations} />);
    const word = flatten(runWithText(screen, 'word').props.style);

    expect(word.fontWeight).toBe('700');
    expect(word.fontFamily).toBe(fonts.bold);
    expect(word.textDecorationLine).toBe('underline');
    expect(word.textDecorationColor).toBe(colors.officialFrequency4);
    expect(word.color).toBe(colors.officialFrequency4);
    expect(flatten(runWithText(screen, ' tail').props.style).textDecorationLine).toBe('none');
    expect(flatten(runWithText(screen, ' tail').props.style).fontWeight).toBe('400');

    const frequencyMarks = indicators(screen);
    expect(frequencyMarks).toHaveLength(1);
    expect(frequencyMarks[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[4]);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-run',
    ]);
    expect(runText(screen)).toBe(verse);
  });

  it('places the single frequency indicator at the annotation end when the span is split', async () => {
    const verse = 'abcdefg';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'abcd' } },
          {
            annotationId: 'f',
            type: 'frequency',
            frequencyTier: 1,
            resolvedTarget: { start: 2, end: 6 },
            sourceTarget: { phrase: 'cdef' },
          },
        ]}
      />,
    );

    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-run',
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-run',
    ]);
    expect(indicators(screen)).toHaveLength(1);
    expect(runWithText(screen, 'cd').props.children).toBe('cd');
    expect(flatten(runWithText(screen, 'cd').props.style).color).toBe(colors.officialFrequency1);
    expect(flatten(runWithText(screen, 'cd').props.style).fontWeight).toBe('700');
    expect(flatten(runWithText(screen, 'ef').props.style).fontWeight).toBe('400');
    expect(flatten(runWithText(screen, 'ef').props.style).color).toBe(colors.officialFrequency1);
    expect(runText(screen)).toBe(verse);
  });

  it.each([1, 2, 3, 4, 5] as const)(
    'renders tier %s in the official color with a non-bold superscript',
    async (tier) => {
      const verse = 'WoRd';
      const tierColor = [
        colors.officialFrequency1,
        colors.officialFrequency2,
        colors.officialFrequency3,
        colors.officialFrequency4,
        colors.officialFrequency5,
      ][tier - 1];
      const screen = await render(
        <OfficialScriptureText
          verseText={verse}
          annotations={[
            {
              annotationId: `f-${tier}`,
              type: 'frequency',
              frequencyTier: tier,
              resolvedTarget: { start: 0, end: 4 },
            },
          ]}
        />,
      );
      expect(flatten(runWithText(screen, verse).props.style).color).toBe(tierColor);
      const indicator = screen.getByTestId('scripture-frequency-indicator', HIDDEN);
      const indicatorStyle = flatten(indicator.props.style);
      expect(indicator.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[tier]);
      expect(indicatorStyle.fontWeight).toBe('400');
      expect(indicatorStyle.fontFamily).toBe(fonts.regular);
      expect(indicatorStyle.textDecorationLine).toBe('none');
      expect(indicatorStyle.color).toBe(tierColor);
      expect(indicator.props.accessibilityLabel).toBeUndefined();
      expect(runText(screen)).toBe(verse);
    },
  );

  it('exposes the canonical verse as the only accessibility label', async () => {
    const verse = 'Alpha beta';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'f',
            type: 'frequency',
            frequencyTier: 2,
            resolvedTarget: { start: 0, end: 5 },
            sourceTarget: { phrase: 'Alpha' },
          },
        ]}
      />,
    );
    const root = screen.getByTestId('official-scripture-text');

    expect(root.props.accessibilityLabel).toBe(verse);
    expect(screen.getAllByLabelText(verse)).toHaveLength(1);
    expect(root.props.accessibilityLabel.includes(FREQUENCY_SUPERSCRIPT_GLYPH[2])).toBe(false);
    expect(runText(screen)).toBe(verse);
    expect(screen.getAllByTestId('official-scripture-text')).toHaveLength(1);
    expect(screen.queryByText(verse)).toBeNull();
    expect(childNodes(screen).some((node) => node.props.children === ' ')).toBe(false);
  });

  it('updates when the verse or annotations change', async () => {
    const screen = await render(<OfficialScriptureText verseText="Alpha" annotations={[]} />);
    expect(flatten(runWithText(screen, 'Alpha').props.style).fontWeight).toBe('400');

    await screen.rerender(
      <OfficialScriptureText
        verseText="Alpha"
        annotations={[{ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 5 } }]}
      />,
    );
    expect(flatten(runWithText(screen, 'Alpha').props.style).fontWeight).toBe('700');
    expect(screen.getByLabelText('Alpha')).toBeTruthy();

    await screen.rerender(<OfficialScriptureText verseText="Beta" annotations={[]} />);
    expect(screen.getByLabelText('Beta').props.accessibilityLabel).toBe('Beta');
    expect(runText(screen)).toBe('Beta');
  });

  it('keeps official formatting when a caller style would otherwise restyle the verse', async () => {
    const verse = 'Alpha beta';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        style={{
          color: '#FF00FF',
          fontWeight: '700',
          fontFamily: fonts.extraBold,
          textDecorationLine: 'line-through',
          fontSize: 30,
        }}
        annotations={[
          { type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 5 }, sourceTarget: { phrase: 'Alpha' } },
          {
            type: 'frequency',
            frequencyTier: 2,
            annotationId: 'f',
            resolvedTarget: { start: 0, end: 5 },
            sourceTarget: { phrase: 'Alpha' },
          },
          { type: 'uniqueEnding', resolvedTarget: { start: 6, end: 10 }, sourceTarget: { phrase: 'beta' } },
        ]}
      />,
    );

    const beginning = flatten(runWithText(screen, 'Alpha').props.style);
    expect(beginning.color).toBe(colors.officialFrequency2);
    expect(beginning.fontWeight).toBe('700');
    expect(beginning.fontFamily).toBe(fonts.bold);
    expect(beginning.textDecorationLine).toBe('none');

    const ending = flatten(runWithText(screen, 'beta').props.style);
    expect(ending.color).toBe(colors.navy);
    expect(ending.fontWeight).toBe('400');
    expect(ending.fontFamily).toBe(fonts.regular);
    expect(ending.textDecorationLine).toBe('underline');
    expect(ending.textDecorationColor).toBe(colors.navy);

    const indicator = flatten(screen.getByTestId('scripture-frequency-indicator', HIDDEN).props.style);
    expect(indicator.fontWeight).toBe('400');
    expect(indicator.textDecorationLine).toBe('none');
    expect(indicator.fontFamily).toBe(fonts.regular);

    expect(flatten(screen.getByTestId('official-scripture-text').props.style).fontSize).toBe(30);
    expect(runText(screen)).toBe(verse);
  });

  it('renders a plain verse when annotations are malformed', async () => {
    const verse = 'abc';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        cardId="c1"
        annotations={[
          { type: 'frequency' },
          { type: 'uniqueBeginning', cardId: 'other', resolvedTarget: { start: 0, end: 3 } },
        ]}
      />,
    );
    expect(runText(screen)).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expect(flatten(runWithText(screen, verse).props.style).fontWeight).toBe('400');
    expect(screen.queryByTestId('scripture-frequency-indicator', HIDDEN)).toBeNull();
  });
});

describe('duplicate annotations and rerenders', () => {
  const duplicateKeyWarnings: string[] = [];
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    duplicateKeyWarnings.length = 0;
    const original = console.error;
    errorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const message = args.map((item) => String(item)).join(' ');
      if (message.includes('same key')) {
        duplicateKeyWarnings.push(message);
        return;
      }
      original(...args);
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
    expect(duplicateKeyWarnings).toEqual([]);
  });

  function renderedElements(screen: Queries): Array<{ key?: string | null; props: { testID?: string; children?: unknown } }> {
    const children = screen.getByTestId('official-scripture-text').props.children;
    if (children == null) {
      return [];
    }
    const list = Array.isArray(children) ? children : [children];
    return list.filter(Boolean);
  }

  function expectUniqueKeys(screen: Queries): void {
    const keys = renderedElements(screen).map((element) => element.key);
    expect(keys.every((key) => typeof key === 'string' && key.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  }

  function expectIndicatorCount(screen: Queries, count: number): void {
    const hostCount = screen.queryAllByTestId('scripture-frequency-indicator', HIDDEN).length;
    const elementCount = renderedElements(screen).filter(
      (element) => element.props.testID === 'scripture-frequency-indicator',
    ).length;
    expect(hostCount).toBe(count);
    expect(elementCount).toBe(count);
  }

  function duplicateHope(): OfficialScriptureAnnotationInput {
    return {
      annotationId: 'same',
      type: 'frequency',
      frequencyTier: 2,
      sourceTarget: { phrase: 'hope' },
      resolvedTarget: { start: 0, end: 4 },
    };
  }

  it('renders no superscript for identical duplicate frequency records', async () => {
    const verse = 'hope hope';
    const screen = await render(
      <OfficialScriptureText verseText={verse} annotations={[duplicateHope(), duplicateHope()]} />,
    );

    expectIndicatorCount(screen, 0);
    expect(runText(screen)).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expect(flatten(runWithText(screen, verse).props.style).color).toBe(colors.navy);
    expect(flatten(runWithText(screen, verse).props.style).fontWeight).toBe('400');
    expectUniqueKeys(screen);
  });

  it('replaces duplicate records with one indicator on the targeted word', async () => {
    const verse = 'hope hope';
    const screen = await render(
      <OfficialScriptureText verseText={verse} annotations={[duplicateHope(), duplicateHope()]} />,
    );
    expectIndicatorCount(screen, 0);
    expect(runText(screen)).toBe(verse);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'moved',
            type: 'frequency',
            frequencyTier: 2,
            sourceTarget: { phrase: 'hope' },
            resolvedTarget: { start: 5, end: 9 },
          },
        ]}
      />,
    );

    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[2]);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-run',
      'scripture-frequency-indicator',
    ]);
    expect(flatten(runWithText(screen, 'hope ').props.style).color).toBe(colors.navy);
    expect(flatten(runWithText(screen, 'hope').props.style).color).toBe(colors.officialFrequency2);
    expect(runText(screen)).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('moves one indicator from the first repeated word to the second', async () => {
    const verse = 'hope hope';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'freq',
            type: 'frequency',
            frequencyTier: 2,
            sourceTarget: { phrase: 'hope' },
            resolvedTarget: { start: 0, end: 4 },
          },
        ]}
      />,
    );

    expectIndicatorCount(screen, 1);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-run',
    ]);
    expect(flatten(runWithText(screen, 'hope').props.style).color).toBe(colors.officialFrequency2);
    expect(flatten(runWithText(screen, ' hope').props.style).color).toBe(colors.navy);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'freq',
            type: 'frequency',
            frequencyTier: 2,
            sourceTarget: { phrase: 'hope' },
            resolvedTarget: { start: 5, end: 9 },
          },
        ]}
      />,
    );

    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[2]);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-run',
      'scripture-frequency-indicator',
    ]);
    expect(flatten(runWithText(screen, 'hope ').props.style).color).toBe(colors.navy);
    expect(flatten(runWithText(screen, 'hope').props.style).color).toBe(colors.officialFrequency2);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('removes formatting and indicators when annotations become empty', async () => {
    const verse = 'hope hope';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'hope' } },
          {
            annotationId: 'freq',
            type: 'frequency',
            frequencyTier: 4,
            sourceTarget: { phrase: 'hope' },
            resolvedTarget: { start: 0, end: 4 },
          },
        ]}
      />,
    );
    expectIndicatorCount(screen, 1);
    expect(flatten(runWithText(screen, 'hope').props.style).fontWeight).toBe('700');
    expect(flatten(runWithText(screen, 'hope').props.style).color).toBe(colors.officialFrequency4);

    await screen.rerender(<OfficialScriptureText verseText={verse} annotations={[]} />);

    expectIndicatorCount(screen, 0);
    expect(runText(screen)).toBe(verse);
    expect(flatten(runWithText(screen, verse).props.style).fontWeight).toBe('400');
    expect(flatten(runWithText(screen, verse).props.style).color).toBe(colors.navy);
    expect(flatten(runWithText(screen, verse).props.style).textDecorationLine).toBe('none');
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('replaces malformed annotations with valid overlapping annotations', async () => {
    const verse = 'abcdef';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'same', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 0, end: 4 } },
          { annotationId: 'same', type: 'frequency', frequencyTier: 4, resolvedTarget: { start: 2, end: 6 } },
        ]}
      />,
    );
    expectIndicatorCount(screen, 0);
    expect(flatten(runWithText(screen, verse).props.style).color).toBe(colors.navy);
    expect(runText(screen)).toBe(verse);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'a', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 0, end: 4 } },
          { annotationId: 'b', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 2, end: 6 } },
        ]}
      />,
    );

    expectIndicatorCount(screen, 2);
    expect(indicators(screen).map((node) => node.props.children)).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
    ]);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-run',
      'scripture-frequency-indicator',
    ]);
    expect(flatten(runWithText(screen, 'ab').props.style).color).toBe(colors.officialFrequency1);
    expect(flatten(runWithText(screen, 'cd').props.style).color).toBe(colors.officialFrequency1);
    expect(flatten(runWithText(screen, 'ef').props.style).color).toBe(colors.officialFrequency1);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('renders distinct same-tier overlaps as separate superscripts', async () => {
    const verse = 'abcdef';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'a', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 0, end: 4 } },
          { annotationId: 'b', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 2, end: 6 } },
        ]}
      />,
    );

    expectIndicatorCount(screen, 2);
    expect(indicators(screen).map((node) => node.props.children)).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
    ]);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);

    const firstKeys = renderedElements(screen).map((element) => element.key);
    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'a', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 0, end: 4 } },
          { annotationId: 'b', type: 'frequency', frequencyTier: 1, resolvedTarget: { start: 2, end: 6 } },
        ]}
      />,
    );
    expect(renderedElements(screen).map((element) => element.key)).toEqual(firstKeys);
    expectIndicatorCount(screen, 2);
  });

  it('renders different annotation types that share a span', async () => {
    const verse = 'word tail';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'beg', type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'word' } },
          { annotationId: 'end', type: 'uniqueEnding', resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'word' } },
          {
            annotationId: 'freq',
            type: 'frequency',
            frequencyTier: 4,
            resolvedTarget: { start: 0, end: 4 },
            sourceTarget: { phrase: 'word' },
          },
        ]}
      />,
    );
    const word = flatten(runWithText(screen, 'word').props.style);

    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[4]);
    expect(word.fontWeight).toBe('700');
    expect(word.textDecorationLine).toBe('underline');
    expect(word.color).toBe(colors.officialFrequency4);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-run',
    ]);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('gives unique keys to frequencies that end on the same character', async () => {
    const verse = 'abcdef';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          { annotationId: 'outer', type: 'frequency', frequencyTier: 2, resolvedTarget: { start: 0, end: 4 } },
          { annotationId: 'inner', type: 'frequency', frequencyTier: 2, resolvedTarget: { start: 2, end: 4 } },
        ]}
      />,
    );

    expectIndicatorCount(screen, 2);
    expect(childNodes(screen).map((node) => node.props.testID)).toEqual([
      'scripture-run',
      'scripture-run',
      'scripture-frequency-indicator',
      'scripture-frequency-indicator',
      'scripture-run',
    ]);
    const indicatorKeys = renderedElements(screen)
      .filter((element) => element.props.testID === 'scripture-frequency-indicator')
      .map((element) => element.key);
    expect(indicatorKeys).toHaveLength(2);
    expect(indicatorKeys[0]).not.toBe(indicatorKeys[1]);
    expect(indicatorKeys.every((key) => key?.startsWith('indicator-'))).toBe(true);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);

    await screen.rerender(
      <OfficialScriptureText
        verseText="hope"
        annotations={[
          { type: 'frequency', frequencyTier: 3, resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'hope' } },
          { type: 'frequency', frequencyTier: 3, resolvedTarget: { start: 0, end: 4 }, sourceTarget: { phrase: 'hope' } },
        ]}
      />,
    );
    expectIndicatorCount(screen, 2);
    expect(indicators(screen).every((node) => node.props.children === FREQUENCY_SUPERSCRIPT_GLYPH[3])).toBe(true);
    expect(runText(screen)).toBe('hope');
    expectUniqueKeys(screen);
  });

  it('updates a valid annotation without leaving a stale superscript', async () => {
    const verse = 'Alpha beta';
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'alpha',
            type: 'frequency',
            frequencyTier: 2,
            resolvedTarget: { start: 0, end: 5 },
            sourceTarget: { phrase: 'Alpha' },
          },
        ]}
      />,
    );
    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[2]);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'alpha',
            type: 'frequency',
            frequencyTier: 5,
            resolvedTarget: { start: 0, end: 5 },
            sourceTarget: { phrase: 'Alpha' },
          },
        ]}
      />,
    );
    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[5]);
    expect(flatten(runWithText(screen, 'Alpha').props.style).color).toBe(colors.officialFrequency5);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'alpha',
            type: 'frequency',
            frequencyTier: 5,
            resolvedTarget: { start: 0, end: 5 },
            sourceTarget: { phrase: 'Alpha' },
          },
          {
            annotationId: 'beta',
            type: 'frequency',
            frequencyTier: 1,
            resolvedTarget: { start: 6, end: 10 },
            sourceTarget: { phrase: 'beta' },
          },
        ]}
      />,
    );
    expectIndicatorCount(screen, 2);
    expect(indicators(screen).map((node) => node.props.children)).toEqual([
      FREQUENCY_SUPERSCRIPT_GLYPH[5],
      FREQUENCY_SUPERSCRIPT_GLYPH[1],
    ]);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'beta',
            type: 'frequency',
            frequencyTier: 1,
            resolvedTarget: { start: 6, end: 10 },
            sourceTarget: { phrase: 'beta' },
          },
        ]}
      />,
    );
    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[1]);
    expect(flatten(runWithText(screen, 'Alpha ').props.style).color).toBe(colors.navy);
    expect(flatten(runWithText(screen, 'beta').props.style).color).toBe(colors.officialFrequency1);
    expect(runText(screen)).toBe(verse);
    expectUniqueKeys(screen);
  });

  it('preserves canonical scripture text across duplicate, valid, and empty updates', async () => {
    const verse = ' (Hope — hope.)\n';
    const hope = verse.indexOf('Hope');
    const screen = await render(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'same',
            type: 'frequency',
            frequencyTier: 2,
            sourceTarget: { phrase: 'Hope' },
            resolvedTarget: { start: hope, end: hope + 4 },
          },
          {
            annotationId: 'same',
            type: 'frequency',
            frequencyTier: 4,
            sourceTarget: { phrase: 'Hope' },
            resolvedTarget: { start: hope, end: hope + 4 },
          },
        ]}
      />,
    );
    expect(runText(screen)).toBe(verse);
    expectIndicatorCount(screen, 0);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);

    await screen.rerender(
      <OfficialScriptureText
        verseText={verse}
        annotations={[
          {
            annotationId: 'one',
            type: 'frequency',
            frequencyTier: 2,
            sourceTarget: { phrase: 'Hope' },
            resolvedTarget: { start: hope, end: hope + 4 },
          },
        ]}
      />,
    );
    expect(runText(screen)).toBe(verse);
    expectIndicatorCount(screen, 1);
    expect(indicators(screen)[0]?.props.children).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[2]);
    expect(runText(screen).includes(FREQUENCY_SUPERSCRIPT_GLYPH[2])).toBe(false);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);

    await screen.rerender(<OfficialScriptureText verseText={verse} annotations={[]} />);
    expect(runText(screen)).toBe(verse);
    expectIndicatorCount(screen, 0);
    expect(runWithText(screen, verse).props.children).toBe(verse);
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expectUniqueKeys(screen);
  });
});
