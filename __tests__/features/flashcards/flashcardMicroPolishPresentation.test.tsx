import { render, screen } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';

import ScorePill from '../../../src/features/flashcards/components/ScorePill';
import StudyHeader from '../../../src/features/flashcards/components/StudyHeader';
import { spacing } from '../../../src/shared/theme';

describe('Flashcard micro-polish presentation', () => {
  it('expands StudyHeader icon buttons to the min touch target without changing icon size', async () => {
    await render(
      <StudyHeader
        title="Luke"
        current={1}
        total={10}
        correctCount={2}
        needsWorkCount={1}
        progress={0.1}
        onBackPress={() => undefined}
        onSettingsPress={() => undefined}
      />,
    );

    const back = screen.getByLabelText('Go back');
    const settings = screen.getByLabelText('Study settings');
    const backStyle = StyleSheet.flatten(back.props.style);
    const settingsStyle = StyleSheet.flatten(settings.props.style);

    expect(back.props.accessibilityRole).toBe('button');
    expect(backStyle.minWidth).toBe(spacing.minTouchTarget);
    expect(backStyle.minHeight).toBe(spacing.minTouchTarget);
    expect(settingsStyle.minWidth).toBe(spacing.minTouchTarget);
    expect(settingsStyle.minHeight).toBe(spacing.minTouchTarget);

    const headerSource = readFileSync(
      join(__dirname, '../../../src/features/flashcards/components/StudyHeader.tsx'),
      'utf8',
    );
    expect(headerSource).toContain('const ICON_SIZE = 24');
    expect(headerSource).toContain('size={ICON_SIZE}');
  });

  it('omits StudyHeader back AT when onBackPress is absent and preserves geometry via spacer', async () => {
    await render(
      <StudyHeader
        title="Luke"
        current={1}
        total={10}
        correctCount={2}
        needsWorkCount={1}
        progress={0.1}
        onSettingsPress={() => undefined}
      />,
    );

    expect(screen.queryByLabelText('Go back')).toBeNull();
    expect(screen.getByLabelText('Study settings')).toBeTruthy();

    const headerSource = readFileSync(
      join(__dirname, '../../../src/features/flashcards/components/StudyHeader.tsx'),
      'utf8',
    );
    expect(headerSource).toContain('onBackPress ?');
    expect(headerSource).toContain('styles.iconButton');
  });

  it('exposes ScorePill counts with spoken labels', async () => {
    await render(
      <>
        <ScorePill variant="correct" count={3} />
        <ScorePill variant="needsWork" count={2} />
      </>,
    );

    expect(screen.getByLabelText('3 correct')).toBeTruthy();
    expect(screen.getByLabelText('2 needs work')).toBeTruthy();
  });

  it('marks unwired Flashcard chrome decorative and documents gesture hints', () => {
    const flashcardSource = readFileSync(
      join(__dirname, '../../../src/features/flashcards/components/Flashcard.tsx'),
      'utf8',
    );
    const activeSource = readFileSync(
      join(__dirname, '../../../src/features/flashcards/components/FlashcardStudyActive.tsx'),
      'utf8',
    );

    expect(flashcardSource).toContain('accessibilityElementsHidden');
    expect(flashcardSource).not.toContain('Play verse audio');
    expect(flashcardSource).toContain('useReducedMotion');
    expect(activeSource).toContain(
      'Tap to flip. Swipe right for correct, swipe left for needs work.',
    );
  });
});
