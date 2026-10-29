import { render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';

import IndexLegend from '../src/features/flashcards/components/IndexLegend';
import {
  FREQUENCY_SUPERSCRIPT_GLYPH,
  officialFrequencyTextColor,
} from '../src/shared/scripture/officialFrequencyStyle';
import type { OfficialFrequencyTier } from '../src/shared/scripture/segmentOfficialAnnotations';
import { colors } from '../src/shared/theme';
import { contrastRatio } from '../test-utils/relativeLuminanceContrast';

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

  it('describes official frequency tiers instead of legacy keyword marks', async () => {
    await render(<IndexLegend mode="official" />);

    expect(screen.getByText('Unique Beg.')).toBeTruthy();
    expect(screen.getByText('Unique End.')).toBeTruthy();
    expect(screen.getByText('1x Frequency')).toBeTruthy();
    expect(screen.getByText('5x Frequency')).toBeTruthy();
    expect(screen.queryByText('1x Keyword')).toBeNull();
    expect(screen.queryByText('Animals')).toBeNull();
    expect(screen.queryByText('/')).toBeNull();
    expect(screen.queryByText('\\')).toBeNull();
    expect(screen.getByLabelText('1x Frequency: colored word with superscript 1')).toBeTruthy();
    expect(screen.getByLabelText('Unique Beginning: bold word')).toBeTruthy();
    expect(screen.getByLabelText('Unique Ending: underlined word')).toBeTruthy();

    const tierOne = within(
      screen.getByLabelText('1x Frequency: colored word with superscript 1'),
    ).getByText('word');
    const tierThree = within(
      screen.getByLabelText('3x Frequency: colored word with superscript 3'),
    ).getByText('word');
    expect(StyleSheet.flatten(tierOne.props.style).color).toBe(colors.officialFrequency1);
    expect(StyleSheet.flatten(tierThree.props.style).color).toBe(colors.officialFrequency3);
    expect(colors.officialFrequency3).toBe('#BE5A0A');
  });

  it('keeps official frequency samples and superscripts at 4.5:1 on the sample surface', async () => {
    await render(<IndexLegend mode="official" />);

    const tiers: readonly OfficialFrequencyTier[] = [1, 2, 3, 4, 5];
    for (const tier of tiers) {
      const tile = screen.getByLabelText(
        `${tier}x Frequency: colored word with superscript ${tier}`,
      );
      const background = String(StyleSheet.flatten(tile.props.style).backgroundColor);
      const wordColor = String(
        StyleSheet.flatten(within(tile).getByText('word').props.style).color,
      );
      const superscriptColor = String(
        StyleSheet.flatten(
          within(tile).getByText(FREQUENCY_SUPERSCRIPT_GLYPH[tier], {
            includeHiddenElements: true,
          }).props.style,
        ).color,
      );

      expect(background).toBe(colors.cardWhite);
      expect(wordColor).toBe(officialFrequencyTextColor[tier]);
      expect(superscriptColor).toBe(wordColor);
      expect(contrastRatio(wordColor, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(superscriptColor, background)).toBeGreaterThanOrEqual(4.5);
    }

    const tierThree = screen.getByLabelText('3x Frequency: colored word with superscript 3');
    const tierThreeColor = String(
      StyleSheet.flatten(within(tierThree).getByText('word').props.style).color,
    );
    const tierThreeBackground = String(StyleSheet.flatten(tierThree.props.style).backgroundColor);
    expect(tierThreeColor).toBe('#BE5A0A');
    expect(tierThreeBackground).toBe('#FFFFFF');
    expect(contrastRatio(tierThreeColor, tierThreeBackground)).toBeCloseTo(4.5100394190224895, 10);

    for (const label of ['Unique Beginning: bold word', 'Unique Ending: underlined word']) {
      const structural = screen.getByLabelText(label);
      expect(StyleSheet.flatten(structural.props.style).backgroundColor).toBe(colors.background);
      const sampleColor = String(
        StyleSheet.flatten(within(structural).getByText('word').props.style).color,
      );
      expect(sampleColor).toBe(colors.navy);
      expect(
        contrastRatio(sampleColor, String(StyleSheet.flatten(structural.props.style).backgroundColor)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps official structural and frequency labels at 4.5:1', async () => {
    await render(<IndexLegend mode="official" />);

    const beginning = screen.getByLabelText('Unique Beginning: bold word');
    const ending = screen.getByLabelText('Unique Ending: underlined word');
    const beginningSample = StyleSheet.flatten(within(beginning).getByText('word').props.style);
    const endingSample = StyleSheet.flatten(within(ending).getByText('word').props.style);
    expect(beginningSample.fontWeight).toBe('700');
    expect(beginningSample.color).toBe(colors.navy);
    expect(beginningSample.textDecorationLine).toBeUndefined();
    expect(endingSample.fontWeight).toBe('400');
    expect(endingSample.color).toBe(colors.navy);
    expect(endingSample.textDecorationLine).toBe('underline');

    const structuralLabels: ReadonlyArray<readonly [ReturnType<typeof screen.getByLabelText>, string]> = [
      [beginning, 'Unique Beg.'],
      [ending, 'Unique End.'],
    ];
    for (const [tile, label] of structuralLabels) {
      const labelStyle = StyleSheet.flatten(within(tile).getByText(label).props.style);
      const tileStyle = StyleSheet.flatten(tile.props.style);
      const background = String(tileStyle.backgroundColor);
      expect(labelStyle.color).toBe(colors.navy);
      expect(labelStyle.fontSize).toBe(11);
      expect(tileStyle.opacity ?? 1).toBe(1);
      expect(labelStyle.opacity ?? 1).toBe(1);
      expect(background).toBe(colors.background);
      expect(contrastRatio(String(labelStyle.color), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(String(labelStyle.color), background)).toBeCloseTo(14.269769740560527, 10);
    }

    for (const tier of [1, 2, 3, 4, 5] as const) {
      const tile = screen.getByLabelText(
        `${tier}x Frequency: colored word with superscript ${tier}`,
      );
      const labelStyle = StyleSheet.flatten(
        within(tile).getByText(`${tier}x Frequency`).props.style,
      );
      const background = String(StyleSheet.flatten(tile.props.style).backgroundColor);
      expect(labelStyle.color).toBe(colors.navy);
      expect(background).toBe(colors.cardWhite);
      expect(contrastRatio(String(labelStyle.color), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(String(labelStyle.color), background)).toBeCloseTo(15.537529558868556, 10);
    }
  });
});
