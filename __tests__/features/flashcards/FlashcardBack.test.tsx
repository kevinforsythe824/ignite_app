import { render, screen } from '@testing-library/react-native';
import React from 'react';

import FlashcardBack from '../../../src/features/flashcards/components/FlashcardBack';

const segments = [{ type: 'text' as const, content: 'Alpha walks.' }];

describe('FlashcardBack index code', () => {
  it('shows the index code in parentheses when the card has one', async () => {
    await render(<FlashcardBack segments={segments} indexCode="A-1" />);

    expect(screen.getByText('(A-1)')).toBeTruthy();
  });

  it('does not render empty parentheses when indexCode is absent or blank', async () => {
    const view = await render(<FlashcardBack segments={segments} />);

    expect(screen.queryByText('()')).toBeNull();
    expect(screen.getByText('Alpha walks.')).toBeTruthy();

    await view.rerender(<FlashcardBack segments={segments} indexCode="   " />);
    expect(screen.queryByText('()')).toBeNull();
  });
});
