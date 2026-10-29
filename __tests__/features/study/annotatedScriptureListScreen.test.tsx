import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import type { Card } from '../../../src/features/flashcards/domain/card';
import type { StudyCurriculum } from '../../../src/features/flashcards/repositories/curriculumRepository';
import { AnnotatedScriptureListScreen } from '../../../src/features/study/screens/AnnotatedScriptureListScreen';
import { StudyHubScreen } from '../../../src/features/study/screens/StudyHubScreen';
import { StudyCurriculumProvider } from '../../../src/features/study/state/StudyCurriculumGate';
import type { StudyStackParamList } from '../../../src/features/study/navigation/types';
import type { CurriculumSection } from '../../../src/features/season/domain/curriculumSection';
import { officialAnnotation, officialStudyCard } from '../../../test-utils/officialFlashcardFixtures';

const SEASON = '2032';
const MATERIAL = 'material-experienced';
const LONG_VERSE = `For we wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world, against spiritual wickedness in high places, and the reader must be able to follow every word without a fixed-height box cutting the line off.`;

function studyCard(
  cardId: string,
  cardNumber: number,
  sectionId: string,
  reference: string,
  verseText: string,
  annotations: Card['annotations'] = [],
): Card {
  return officialStudyCard({
    cardId,
    cardNumber,
    seasonId: SEASON,
    materialSetId: MATERIAL,
    sectionId,
    reference,
    verseText,
    annotations,
  });
}

function studySection(
  sectionId: string,
  title: string,
  displayOrder: number,
  cardIds: readonly string[],
): CurriculumSection {
  return {
    seasonId: SEASON,
    materialSetId: MATERIAL,
    sectionId,
    title,
    displayOrder,
    cardIds,
  };
}

const alpha = studyCard('alpha', 2, 'armor', 'Ephesians 6:11', 'Alpha walks onward.', [
  officialAnnotation({
    cardId: 'alpha',
    annotationId: 'alpha-beg',
    type: 'uniqueBeginning',
    start: 0,
    end: 5,
  }),
]);
const beta = studyCard('beta', 1, 'armor', 'Ephesians 6:12', LONG_VERSE);
const gamma = studyCard('gamma', 9, 'walk', 'John 11:35', 'Gamma speaks.');

const curriculum: StudyCurriculum = {
  seasonId: SEASON,
  materialSetId: MATERIAL,
  title: 'Experienced',
  cards: [alpha, beta, gamma],
  sections: [
    studySection('walk', 'Walk by Faith', 2, ['gamma']),
    studySection('empty', 'Empty Boundary', 0, []),
    studySection('armor', 'Armor of God', 1, ['beta', 'alpha']),
  ],
};

function renderReader(value: StudyCurriculum = curriculum) {
  const Stack = createNativeStackNavigator<StudyStackParamList>();
  return render(
    <StudyCurriculumProvider curriculum={value}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="StudyHub" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="StudyHub" component={StudyHubScreen} />
          <Stack.Screen name="AnnotatedScriptureList" component={AnnotatedScriptureListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </StudyCurriculumProvider>,
  );
}

function accessibilityLabels(node: TestInstance): string[] {
  const labels: string[] = [];
  const walk = (current: TestInstance) => {
    if (current.props?.accessible === false) {
      return;
    }
    const label = current.props?.accessibilityLabel;
    if (typeof label === 'string') {
      labels.push(label);
    }
    for (const child of current.children) {
      if (typeof child !== 'string') {
        walk(child);
      }
    }
  };
  walk(node);
  return labels;
}

describe('AnnotatedScriptureListScreen', () => {
  it('opens the selected material from the hub and reads every section in order', async () => {
    await renderReader();

    expect(screen.getByLabelText('View All Material')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));

    expect(await screen.findByTestId('scripture-list-screen')).toBeTruthy();
    expect(screen.getByLabelText('Back to Study Hub')).toBeTruthy();
    expect(screen.getByText('All Scripture')).toBeTruthy();
    expect(screen.getByTestId('scripture-material-title').props.children).toBe('Experienced');
    expect(screen.getByLabelText('Material set, Experienced')).toBeTruthy();

    const headers = screen.getAllByRole('header').map((node) => {
      return typeof node.props.accessibilityLabel === 'string'
        ? node.props.accessibilityLabel
        : node.props.children;
    });
    expect(headers).toEqual([
      'All Scripture',
      'Empty Boundary',
      'Armor of God, 2 verses',
      'Walk by Faith, 1 verse',
    ]);

    expect(screen.getByLabelText('Scripture reference, Ephesians 6:12')).toBeTruthy();
    expect(screen.getByLabelText('Scripture reference, Ephesians 6:11')).toBeTruthy();
    expect(screen.getByLabelText('Scripture reference, John 11:35')).toBeTruthy();
    expect(screen.getByLabelText(LONG_VERSE).props.accessibilityLabel).toBe(LONG_VERSE);
    expect(screen.getByLabelText('Alpha walks onward.')).toBeTruthy();
    expect(screen.getByLabelText('Gamma speaks.')).toBeTruthy();
    expect(screen.getByText(LONG_VERSE).props.numberOfLines).toBeUndefined();

    const bold = screen
      .getAllByTestId('scripture-run')
      .find((node) => node.props.children === 'Alpha');
    expect(StyleSheet.flatten(bold?.props.style).fontWeight).toBe('700');

    const listLabels = accessibilityLabels(screen.getByTestId('annotated-scripture-list'));
    expect(listLabels).toEqual([
      'Empty Boundary',
      'Armor of God, 2 verses',
      'Scripture reference, Ephesians 6:12',
      LONG_VERSE,
      'Scripture reference, Ephesians 6:11',
      'Alpha walks onward.',
      'Walk by Faith, 1 verse',
      'Scripture reference, John 11:35',
      'Gamma speaks.',
    ]);

    expect(screen.getAllByText('All Scripture')).toHaveLength(1);

    fireEvent.press(screen.getByLabelText('Back to Study Hub'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    expect(screen.queryByLabelText(LONG_VERSE)).toBeNull();

    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Gamma speaks.')).toBeTruthy();
    expect(screen.queryByLabelText('Mark as correct')).toBeNull();
    expect(screen.queryByLabelText('0 correct')).toBeNull();
  });

  it('windows a longer section without a fixed row height', async () => {
    const cards = Array.from({ length: 30 }, (_, index) =>
      studyCard(
        `card-${index}`,
        index + 1,
        'long',
        `Ref ${index}`,
        `Verse ${index} stays in cardIds order.`,
      ),
    );
    await renderReader({
      seasonId: SEASON,
      materialSetId: MATERIAL,
      title: 'Experienced',
      cards,
      sections: [studySection('long', 'Long section', 1, cards.map((item) => item.cardId))],
    });
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Verse 0 stays in cardIds order.')).toBeTruthy();
    expect(screen.getByLabelText('Long section, 30 verses')).toBeTruthy();
    const mounted = screen.getAllByTestId(/scripture-verse-/);
    expect(mounted.length).toBeGreaterThan(0);
    expect(mounted.length).toBeLessThan(30);
    expect(screen.queryByLabelText('Verse 29 stays in cardIds order.')).toBeNull();
  });

  it('shows a safe empty state when the material has no verses', async () => {
    await render(
      <StudyCurriculumProvider
        curriculum={{
          seasonId: SEASON,
          materialSetId: MATERIAL,
          title: 'Experienced',
          cards: [],
          sections: [],
        }}
      >
        <NavigationContainer>
          <AnnotatedScriptureListScreen />
        </NavigationContainer>
      </StudyCurriculumProvider>,
    );

    expect(await screen.findByTestId('scripture-list-empty')).toBeTruthy();
    expect(screen.getByText('No scripture available')).toBeTruthy();
    expect(screen.queryByTestId('annotated-scripture-list')).toBeNull();
    expect(screen.getByLabelText('Back to Study Hub')).toBeTruthy();
  });

  it('does not show a partial list when section membership is invalid', async () => {
    const orphan = studyCard('orphan', 1, 'missing', 'John 1:1', 'Hidden orphan verse.');
    await renderReader({
      seasonId: SEASON,
      materialSetId: MATERIAL,
      title: 'Experienced',
      cards: [orphan],
      sections: [studySection('armor', 'Armor', 1, [])],
    });

    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByTestId('scripture-list-unavailable')).toBeTruthy();
    expect(screen.getByText("Scripture isn't available")).toBeTruthy();
    expect(screen.queryByText('Hidden orphan verse.')).toBeNull();
    expect(screen.queryByText('Armor')).toBeNull();
    expect(screen.queryByText('Miscellaneous')).toBeNull();
  });

  it('does not fetch curriculum or own flashcard scoring', () => {
    const screenSource = readFileSync(
      join(__dirname, '../../../src/features/study/screens/AnnotatedScriptureListScreen.tsx'),
      'utf8',
    );
    const documentSource = readFileSync(
      join(__dirname, '../../../src/features/study/components/AnnotatedScriptureDocument.tsx'),
      'utf8',
    );
    expect(screenSource).not.toContain('firebase');
    expect(screenSource).not.toContain('getCurriculum');
    expect(screenSource).not.toContain('markCorrect');
    expect(screenSource).not.toContain('ScrollView');
    expect(screenSource).not.toContain('FlashcardSession');
    expect(documentSource).toContain('SectionList');
    expect(documentSource).toContain('initialNumToRender={SCRIPTURE_LIST_INITIAL_RENDER}');
    expect(documentSource).toContain('keyExtractor={scriptureItemKey}');
    expect(documentSource).toContain('const SCRIPTURE_LIST_INITIAL_RENDER = 8');
    expect(documentSource).toContain('const SCRIPTURE_LIST_WINDOW_SIZE = 7');
    expect(documentSource).not.toContain('ScrollView');
    expect(documentSource).not.toContain('getItemLayout');
  });
});
