import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { Card } from '../../../src/features/flashcards/domain/card';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../../src/features/flashcards/domain/testSeason';
import {
  FlashcardSessionProvider,
  useFlashcardSessionActions,
} from '../../../src/features/flashcards/state/FlashcardSessionContext';
import FlashcardStudyScreen from '../../../src/screens/FlashcardStudyScreen';
import { spacing } from '../../../src/shared/theme';

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

/** Session API stand-in for the removed Next button. Does not render a control. */
const sessionControls: { goToNext: (count?: number) => void } = {
  goToNext: () => {
    throw new Error('Study session is not mounted');
  },
};

function SessionControls() {
  const { goToNext } = useFlashcardSessionActions();
  sessionControls.goToNext = (count = 1) => {
    for (let index = 0; index < count; index += 1) {
      goToNext();
    }
  };
  return null;
}

async function renderStudy(): Promise<void> {
  await render(
    <FlashcardSessionProvider seasonId={TEST_SEASON_ID} title="Test Deck" cards={studyCards}>
      <SessionControls />
      <FlashcardStudyScreen />
    </FlashcardSessionProvider>,
  );
}

async function moveForward(count: number): Promise<void> {
  await act(async () => {
    sessionControls.goToNext(count);
  });
}

function expectNoNextControl(): void {
  expect(screen.queryByLabelText('Next card')).toBeNull();
  expect(screen.queryByText('chevron-forward')).toBeNull();
}

describe('Previous card navigation', () => {
  beforeEach(() => {
    sessionControls.goToNext = () => {
      throw new Error('Study session is not mounted');
    };
  });

  it('shows Previous card disabled on the first card', async () => {
    await renderStudy();

    const previous = screen.getByLabelText('Previous card');
    const previousStyle = StyleSheet.flatten(previous.props.style);

    expect(previous.props.accessibilityRole).toBe('button');
    expect(previous.props.accessibilityState).toEqual({ disabled: true });
    expect(previousStyle.minWidth).toBe(spacing.minTouchTarget);
    expect(previousStyle.minHeight).toBe(spacing.minTouchTarget);
    expect(
      within(previous).getByTestId('previous-card-icon', { includeHiddenElements: true }),
    ).toBeTruthy();
    expectNoNextControl();
    expect(screen.getByText('Test 1:1')).toBeTruthy();

    const user = userEvent.setup();
    await user.press(previous);

    expect(screen.getByText('Test 1:1')).toBeTruthy();
    expect(screen.queryByText('Test 1:3')).toBeNull();
    expect(screen.getByLabelText('Previous card').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('enables Previous after moving ahead and returns to the prior card without scoring', async () => {
    await renderStudy();
    const user = userEvent.setup();

    await moveForward(1);

    expect(screen.getByText('Test 1:2')).toBeTruthy();
    expect(screen.getByLabelText('Previous card').props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(
      within(screen.getByLabelText('Previous card')).getByTestId('previous-card-icon', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expect(screen.getByLabelText('0 needs work')).toBeTruthy();
    expectNoNextControl();

    await user.press(screen.getByLabelText('Previous card'));

    expect(screen.getByText('Test 1:1')).toBeTruthy();
    expect(screen.queryByText('Test 1:2')).toBeNull();
    expect(screen.getByLabelText('Previous card').props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(screen.getByLabelText('0 correct')).toBeTruthy();
    expectNoNextControl();
  });

  it('returns from a later card and does not render a Next control', async () => {
    await renderStudy();
    const user = userEvent.setup();

    await moveForward(2);

    expect(screen.getByText('Test 1:3')).toBeTruthy();
    expect(screen.getByLabelText('Previous card').props.accessibilityState).toEqual({
      disabled: false,
    });
    expectNoNextControl();

    await user.press(screen.getByLabelText('Previous card'));
    expect(screen.getByText('Test 1:2')).toBeTruthy();
    expectNoNextControl();
  });
});
