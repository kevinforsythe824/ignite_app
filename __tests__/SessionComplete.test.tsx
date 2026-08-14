import { render, screen } from '@testing-library/react-native';
import React from 'react';

import SessionComplete from '../src/features/flashcards/components/SessionComplete';

describe('SessionComplete', () => {
  it('summarizes the session with Correct / Needs Work, not mastered', async () => {
    await render(
      <SessionComplete
        correctCount={4}
        needsWorkCount={2}
        totalCards={6}
        onRestart={() => undefined}
      />,
    );

    expect(screen.getByText('Study complete')).toBeTruthy();
    expect(screen.getByText('4 correct · 2 needs work · 6 cards')).toBeTruthy();
    expect(screen.queryByText(/deck complete/i)).toBeNull();
    expect(screen.queryByText(/mastered/i)).toBeNull();
    expect(screen.queryByText(/to practice/i)).toBeNull();
  });
});
