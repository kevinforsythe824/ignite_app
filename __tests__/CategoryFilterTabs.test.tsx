import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import CategoryFilterTabs from '../src/features/flashcards/components/CategoryFilterTabs';
import { CATEGORY_FILTER_OPTIONS } from '../src/features/flashcards/types/settings';

describe('CategoryFilterTabs', () => {
  it('renders every Index Legend category in legend order', async () => {
    await render(<CategoryFilterTabs selected={[]} onToggle={jest.fn()} />);

    for (const option of CATEGORY_FILTER_OPTIONS) {
      expect(screen.getByText(option.label)).toBeTruthy();
    }

    const labels = CATEGORY_FILTER_OPTIONS.map((option) => option.label);
    expect(labels.slice(0, 3)).toEqual(['1x Keyword', '2x Keyword', '3x Keyword']);
    expect(labels.slice(3, 7)).toEqual([
      'Animals',
      'Proper Name',
      'Body Parts',
      'Geo Location',
    ]);
    expect(labels.slice(7)).toEqual([
      'Unique Beg.',
      'Unique End.',
      'Questions',
      'Exclamations',
    ]);
  });

  it('toggles a selected filter chip', async () => {
    const onToggle = jest.fn();
    await render(
      <CategoryFilterTabs selected={['animals']} onToggle={onToggle} />,
    );

    expect(screen.getByLabelText('Filter Animals').props.accessibilityState).toEqual({
      selected: true,
    });

    fireEvent.press(screen.getByLabelText('Filter Proper Name'));
    expect(onToggle).toHaveBeenCalledWith('properName');
  });

  it('shows Clear only when filters are selected and clears them', async () => {
    const onClear = jest.fn();
    const { rerender } = await render(
      <CategoryFilterTabs selected={[]} onToggle={jest.fn()} onClear={onClear} />,
    );

    expect(screen.queryByLabelText('Clear category filters')).toBeNull();

    await rerender(
      <CategoryFilterTabs
        selected={['animals', 'keyword1x']}
        onToggle={jest.fn()}
        onClear={onClear}
      />,
    );

    fireEvent.press(screen.getByLabelText('Clear category filters'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
