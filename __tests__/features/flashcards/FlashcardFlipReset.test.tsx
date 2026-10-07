import { render } from '@testing-library/react-native';
import React from 'react';

import Flashcard from '../../../src/features/flashcards/components/Flashcard';
import type { Card } from '../../../src/features/flashcards/domain/card';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../../src/features/flashcards/domain/testSeason';

jest.mock('../../../src/features/flashcards/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

/** rotation, translateX, translateY, opacity, answer lock */
const mockFlashcardSharedValueCount = 5;

const mockFlipState: { cells: { value: number | boolean }[]; calls: number } = {
  cells: [],
  calls: 0,
};

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    useSharedValue: (initial: number | boolean) => {
      const index = mockFlipState.calls % mockFlashcardSharedValueCount;
      mockFlipState.calls += 1;
      if (mockFlipState.cells[index] === undefined) {
        mockFlipState.cells[index] = { value: initial };
      }
      return mockFlipState.cells[index];
    },
    useAnimatedStyle: (updater: () => object) => updater(),
    withTiming: (value: number) => value,
    withSpring: (value: number) => value,
    interpolate: (_value: number, _inputRange: number[], outputRange: number[]) => outputRange[0],
    Extrapolation: { CLAMP: 'clamp' },
    Easing: {
      inOut: (fn: unknown) => fn,
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      cubic: (value: unknown) => value,
      quad: (value: unknown) => value,
      bezier: () => (value: unknown) => value,
    },
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: (...args: never[]) => unknown) => fn,
  };
});

function makeCard(cardId: string, reference: string): Card {
  return {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId,
    cardNumber: 1,
    reference,
    verseText: 'Verse text.',
    matchedRules: [],
    tags: [],
  };
}

describe('Flashcard flip reset on card change', () => {
  beforeEach(() => {
    mockFlipState.cells = [];
    mockFlipState.calls = 0;
  });

  it('resets to the default side when the card changes and keeps a flip on the same card', async () => {
    const cardA = makeCard('card-a', 'Test 1:1');
    const cardB = makeCard('card-b', 'Test 1:2');
    const props = {
      segments: [],
      defaultSide: 'locate' as const,
      onSwipeCorrect: jest.fn(),
      onSwipeNeedsWork: jest.fn(),
    };

    const view = await render(<Flashcard card={cardA} {...props} />);

    expect(mockFlipState.cells[0]?.value).toBe(0);
    mockFlipState.cells[0].value = 180;

    await view.rerender(<Flashcard card={cardA} {...props} />);
    expect(mockFlipState.cells[0].value).toBe(180);

    await view.rerender(<Flashcard card={cardB} {...props} />);
    expect(mockFlipState.cells[0].value).toBe(0);
  });
});
