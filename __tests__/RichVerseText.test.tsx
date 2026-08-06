import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';

import RichVerseText from '../src/features/flashcards/components/RichVerseText';
import type { VerseSegment } from '../src/features/flashcards/types/verse';
import { colors } from '../src/shared/theme';

type Queries = Awaited<ReturnType<typeof render>>;

function flattenStyleFor(text: string, screen: Queries): TextStyle {
  return StyleSheet.flatten(screen.getByText(text).props.style) as TextStyle;
}

describe('RichVerseText', () => {
  it('layers a unique-beginning underline over the keyword colour', async () => {
    const segments: VerseSegment[] = [
      { type: 'text', content: '(And this ', mark: 'uniqueBeginning' },
      { type: 'keyword1x', content: 'taxing', mark: 'uniqueBeginning' },
      { type: 'slash', content: '/' },
      { type: 'text', content: ' was first made.' },
    ];

    const screen = await render(<RichVerseText segments={segments} />);

    const keyword = flattenStyleFor('taxing', screen);
    expect(keyword.color).toBe(colors.keyword1x);
    expect(keyword.textDecorationLine).toBe('underline');
    expect(keyword.textDecorationColor).toBe(colors.markUnique);

    // The slash sits outside the underline.
    expect(flattenStyleFor('/', screen).textDecorationLine).toBeUndefined();
    expect(flattenStyleFor(' was first made.', screen).textDecorationLine).toBeUndefined();
  });

  it('uses red for questions and blue for exclamations', async () => {
    const screen = await render(
      <RichVerseText
        segments={[
          { type: 'text', content: 'How long?', mark: 'question' },
          { type: 'text', content: ' Behold!', mark: 'exclamation' },
        ]}
      />,
    );

    expect(flattenStyleFor('How long?', screen).textDecorationColor).toBe(colors.markQuestion);
    expect(flattenStyleFor(' Behold!', screen).textDecorationColor).toBe(colors.markExclamation);
  });
});
