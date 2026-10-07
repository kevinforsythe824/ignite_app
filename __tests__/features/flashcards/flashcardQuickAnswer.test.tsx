import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Easing } from 'react-native-reanimated';

import type { Card } from '../../../src/features/flashcards/domain/card';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../../src/features/flashcards/domain/testSeason';
import { FlashcardSessionProvider } from '../../../src/features/flashcards/state/FlashcardSessionContext';
import FlashcardStudyScreen from '../../../src/screens/FlashcardStudyScreen';
import { spacing } from '../../../src/shared/theme';

jest.mock('../../../src/features/flashcards/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

interface MockFlyOff {
  target: number;
  duration: number;
  easing: unknown;
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
      config?: { duration?: number; easing?: unknown },
      callback?: (finished?: boolean) => void,
    ) => {
      if (typeof callback === 'function') {
        mockFlyOffs.push({
          target: value,
          duration: config?.duration ?? 0,
          easing: config?.easing,
          finish: callback,
        });
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

const studyCards: Card[] = [
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't1',
    cardNumber: 1,
    reference: 'Test 1:1',
    verseText: 'First verse.',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't2',
    cardNumber: 2,
    reference: 'Test 1:2',
    verseText: 'Second verse.',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't3',
    cardNumber: 3,
    reference: 'Test 1:3',
    verseText: 'Third verse.',
    matchedRules: [],
    tags: [],
  },
];

const FLY_OFF_DISTANCE = Dimensions.get('window').width * 1.5;

async function renderStudy(): Promise<void> {
  await render(
    <FlashcardSessionProvider seasonId={TEST_SEASON_ID} title="Test Deck" cards={studyCards}>
      <FlashcardStudyScreen />
    </FlashcardSessionProvider>,
  );
}

async function finishFlyOff(index = 0): Promise<void> {
  await act(async () => {
    mockFlyOffs[index]?.finish(true);
  });
}

describe('Flashcard quick answers', () => {
  beforeEach(() => {
    mockFlyOffs.length = 0;
  });

  it('flies the card right and marks correct once after the fly-off finishes', async () => {
    await renderStudy();
    const user = userEvent.setup();
    const correct = screen.getByLabelText('Mark as correct');
    const correctStyle = StyleSheet.flatten(correct.props.style);

    expect(correct.props.accessibilityRole).toBe('button');
    expect(correctStyle.width).toBe(spacing.minTouchTarget);
    expect(correctStyle.height).toBe(spacing.minTouchTarget);
    expect(screen.getByText('Tap to flip')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Tap to flip. Swipe right or press the check button for correct, swipe left or press the X button for needs work.',
      ),
    ).toBeTruthy();

    const circle = screen.getByTestId('correct-quick-answer', { includeHiddenElements: true });
    const circleStyle = StyleSheet.flatten(circle.props.style);
    expect(circleStyle.width).toBe(36);
    expect(circleStyle.height).toBe(36);
    expect(circleStyle.borderWidth).toBe(1.5);
    expect(circleStyle.borderColor).toBe('#34D399');
    expect(circleStyle.backgroundColor).toBe('#F0FDF4');
    expect(within(correct).getByText('checkmark', { includeHiddenElements: true })).toBeTruthy();

    await user.press(correct);

    expect(screen.getByText('Test 1:1')).toBeTruthy();
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();
    expect(mockFlyOffs).toHaveLength(1);
    expect(mockFlyOffs[0]?.target).toBe(FLY_OFF_DISTANCE);
    expect(mockFlyOffs[0]?.duration).toBe(340);
    expect(mockFlyOffs[0]?.easing).toEqual(Easing.inOut(Easing.cubic));

    await finishFlyOff();

    expect(screen.getByText('Test 1:2')).toBeTruthy();
    expect(screen.queryByText('Test 1:1')).toBeNull();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();
    expect(mockFlyOffs).toHaveLength(1);
  });

  it('flies the card left and marks needs work once after the fly-off finishes', async () => {
    await renderStudy();
    const user = userEvent.setup();
    const needsWork = screen.getByLabelText('Mark as needs work');
    const needsWorkStyle = StyleSheet.flatten(needsWork.props.style);

    expect(needsWork.props.accessibilityRole).toBe('button');
    expect(needsWorkStyle.width).toBe(spacing.minTouchTarget);
    expect(needsWorkStyle.height).toBe(spacing.minTouchTarget);

    const circle = screen.getByTestId('needs-work-quick-answer', { includeHiddenElements: true });
    const circleStyle = StyleSheet.flatten(circle.props.style);
    expect(circleStyle.width).toBe(36);
    expect(circleStyle.height).toBe(36);
    expect(circleStyle.borderWidth).toBe(1.5);
    expect(circleStyle.borderColor).toBe('#F87171');
    expect(circleStyle.backgroundColor).toBe('#FEF2F2');
    expect(within(needsWork).getByText('close', { includeHiddenElements: true })).toBeTruthy();

    await user.press(needsWork);

    expect(screen.getByText('Test 1:1')).toBeTruthy();
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();
    expect(mockFlyOffs).toHaveLength(1);
    expect(mockFlyOffs[0]?.target).toBe(-FLY_OFF_DISTANCE);
    expect(mockFlyOffs[0]?.duration).toBe(340);
    expect(mockFlyOffs[0]?.easing).toEqual(Easing.inOut(Easing.cubic));

    await finishFlyOff();

    expect(screen.getByText('Test 1:2')).toBeTruthy();
    expect(screen.queryByText('Test 1:1')).toBeNull();
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expect(screen.getByLabelText('1 needs work')).toBeTruthy();
    expect(mockFlyOffs).toHaveLength(1);
  });

  it('does not score the same card twice when quick answers repeat before fly-off finishes', async () => {
    await renderStudy();
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Mark as correct'));
    await user.press(screen.getByLabelText('Mark as correct'));
    await user.press(screen.getByLabelText('Mark as needs work'));

    expect(mockFlyOffs).toHaveLength(1);
    expect(mockFlyOffs[0]?.target).toBe(FLY_OFF_DISTANCE);
    expect(screen.getByText('Test 1:1')).toBeTruthy();
    expect(screen.getByLabelText('0 correct')).toBeTruthy();

    await finishFlyOff();

    expect(screen.getByText('Test 1:2')).toBeTruthy();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();

    await user.press(screen.getByLabelText('Mark as needs work'));
    await user.press(screen.getByLabelText('Mark as correct'));

    expect(mockFlyOffs).toHaveLength(2);
    expect(mockFlyOffs[1]?.target).toBe(-FLY_OFF_DISTANCE);

    await finishFlyOff(1);

    expect(screen.getByText('Test 1:3')).toBeTruthy();
    expect(screen.getByLabelText('1 correct')).toBeTruthy();
    expect(screen.getByLabelText('1 needs work')).toBeTruthy();
    expect(mockFlyOffs).toHaveLength(2);
  });
});
