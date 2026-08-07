import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';

import IndexLegend from '../src/features/flashcards/components/IndexLegend';
import { colors } from '../src/shared/theme';

describe('IndexLegend', () => {
  it('renders keyword, category, and structural legend samples', async () => {
    await render(<IndexLegend />);

    expect(screen.getByText('Index Legend')).toBeTruthy();

    expect(screen.getByText('1x Keyword')).toBeTruthy();
    expect(screen.getByText('2x Keyword')).toBeTruthy();
    expect(screen.getByText('3x Keyword')).toBeTruthy();

    expect(screen.getByText('Animals')).toBeTruthy();
    expect(screen.getByText('Proper Name')).toBeTruthy();
    expect(screen.getByText('Body Parts')).toBeTruthy();
    expect(screen.getByText('Geo Location')).toBeTruthy();

    expect(screen.getByText('Unique Beg.')).toBeTruthy();
    expect(screen.getByText('Unique End.')).toBeTruthy();
    expect(screen.getByText('Questions')).toBeTruthy();
    expect(screen.getByText('Exclamations')).toBeTruthy();
  });

  it('uses mark underline colors for structural samples', async () => {
    await render(<IndexLegend />);

    const samples = screen.getAllByText('word');
    // Three keyword samples + four structural samples.
    expect(samples).toHaveLength(7);

    const structuralStyles = samples.slice(3).map(
      (node) => StyleSheet.flatten(node.props.style) as TextStyle,
    );

    expect(structuralStyles[0].textDecorationColor).toBe(colors.markUnique);
    expect(structuralStyles[1].textDecorationColor).toBe(colors.markUnique);
    expect(structuralStyles[2].textDecorationColor).toBe(colors.markQuestion);
    expect(structuralStyles[3].textDecorationColor).toBe(colors.markExclamation);

    expect(screen.getByText('/')).toBeTruthy();
    expect(screen.getByText('\\')).toBeTruthy();
  });

  it('lays out category pills in an equal-width two-up grid', async () => {
    await render(<IndexLegend />);

    const animals = screen.getByLabelText('Category tag: Animals');
    const style = StyleSheet.flatten(animals.props.style) as {
      flexBasis?: string | number;
      maxWidth?: string | number;
      flexGrow?: number;
    };

    expect(style.flexBasis).toBe('46%');
    expect(style.maxWidth).toBe('48%');
    expect(style.flexGrow).toBe(1);
  });
});
