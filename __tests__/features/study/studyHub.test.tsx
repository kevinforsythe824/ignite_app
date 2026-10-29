import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { TestInstance } from 'test-renderer';

import type { CurriculumSection } from '../../../src/features/season/domain/curriculumSection';
import { FlashcardStudyRoute } from '../../../src/features/flashcards/screens/FlashcardStudyRoute';
import { StudyHubScreen } from '../../../src/features/study/screens/StudyHubScreen';
import { StudyCurriculumProvider } from '../../../src/features/study/state/StudyCurriculumGate';
import type { StudyStackParamList } from '../../../src/features/study/navigation/types';
import type { StudyCurriculum } from '../../../src/features/flashcards/repositories/curriculumRepository';
import { colors } from '../../../src/shared/theme';
import { officialAnnotation, officialStudyCard } from '../../../test-utils/officialFlashcardFixtures';
import { contrastRatio, parseSrgbHex } from '../../../test-utils/relativeLuminanceContrast';

type PressStyle =
  | StyleProp<ViewStyle>
  | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

interface StyleFiber {
  return: StyleFiber | null;
  memoizedProps?: { style?: PressStyle };
}

function pressStyleFromInstance(node: TestInstance): PressStyle {
  let fiber = node.unstable_fiber as StyleFiber | null;
  while (fiber) {
    const style = fiber.memoizedProps?.style;
    if (typeof style === 'function') {
      return style;
    }
    fiber = fiber.return;
  }
  return node.props.style as PressStyle;
}

function flattenPressStyle(style: PressStyle, pressed: boolean): ViewStyle {
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return StyleSheet.flatten(resolved) ?? {};
}

function styleOpacity(style: ViewStyle | TextStyle | undefined): number {
  return typeof style?.opacity === 'number' ? style.opacity : 1;
}

function ancestorOpacity(node: TestInstance): number {
  let opacity = 1;
  let current = node.parent;
  while (current) {
    opacity *= styleOpacity(StyleSheet.flatten(current.props.style));
    current = current.parent;
  }
  return opacity;
}

function pageBackdrop(node: TestInstance): string {
  let current = node.parent;
  while (current) {
    const background = StyleSheet.flatten(current.props.style)?.backgroundColor;
    if (typeof background === 'string' && /^#[0-9A-Fa-f]{6}$/.test(background)) {
      return background;
    }
    current = current.parent;
  }
  return colors.background;
}

/** Source-over composite. Opacity 1 leaves the color unchanged. */
function compositeHex(foreground: string, background: string, alpha: number): string {
  if (alpha === 1) {
    return foreground;
  }
  const fg = parseSrgbHex(foreground);
  const bg = parseSrgbHex(background);
  const channel = (front: number, back: number) => Math.round(front * alpha + back * (1 - alpha));
  const hex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(channel(fg.r, bg.r))}${hex(channel(fg.g, bg.g))}${hex(channel(fg.b, bg.b))}`;
}

function studyAllPressEvent() {
  return {
    persist: () => undefined,
    nativeEvent: {
      changedTouches: [],
      identifier: 0,
      locationX: 0,
      locationY: 0,
      pageX: 0,
      pageY: 0,
      target: 0,
      timestamp: Date.now(),
      touches: [],
    },
    currentTarget: { measure: () => undefined },
  };
}

const LONG_TITLE =
  'Prepare Yourself for Battle and Keep Going Further Than a Narrow Screen Expects';

function studyCard(cardId: string, cardNumber: number, withBeginning: boolean) {
  return officialStudyCard({
    cardId,
    cardNumber,
    seasonId: '2032',
    materialSetId: 'material-experienced',
    reference: `Ref ${cardId}`,
    verseText: cardId === 'alpha' ? 'Alpha walks.' : 'Beta speaks.',
    annotations: withBeginning
      ? [
          officialAnnotation({
            cardId,
            annotationId: `${cardId}-beg`,
            type: 'uniqueBeginning',
            start: 0,
            end: 5,
          }),
        ]
      : [],
  });
}

function studySection(
  sectionId: string,
  title: string,
  displayOrder: number,
  cardIds: readonly string[],
): CurriculumSection {
  return {
    seasonId: '2032',
    materialSetId: 'material-experienced',
    sectionId,
    title,
    displayOrder,
    cardIds,
  };
}

const curriculum: StudyCurriculum = {
  seasonId: '2032',
  materialSetId: 'material-experienced',
  title: 'Experienced',
  cards: [
    studyCard('alpha', 1, true),
    studyCard('beta', 2, false),
    officialStudyCard({
      cardId: 'other-set',
      cardNumber: 1,
      seasonId: '2032',
      materialSetId: 'material-cadet',
      reference: 'Ref other',
      verseText: 'Other set verse.',
    }),
  ],
  sections: [
    studySection('helmet', 'Helmet of Salvation', 2, ['alpha', 'beta']),
    studySection('prepare', LONG_TITLE, 1, []),
  ],
};

const navigationRef = createNavigationContainerRef<StudyStackParamList>();

function renderHub() {
  const Stack = createNativeStackNavigator<StudyStackParamList>();
  return render(
    <StudyCurriculumProvider curriculum={curriculum}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="StudyHub" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="StudyHub" component={StudyHubScreen} />
          <Stack.Screen name="FlashcardStudy" component={FlashcardStudyRoute} />
        </Stack.Navigator>
      </NavigationContainer>
    </StudyCurriculumProvider>,
  );
}

describe('StudyHubScreen', () => {
  it('shows the selected material, Study All, and sections in order', async () => {
    await renderHub();

    expect(screen.getByTestId('study-hub')).toBeTruthy();
    expect(screen.getByText('Study')).toBeTruthy();
    expect(screen.getByTestId('study-material-title').props.children).toBe('Experienced');
    expect(screen.getByLabelText('Study All Material, 2 cards')).toBeTruthy();
    expect(screen.getByText(LONG_TITLE)).toBeTruthy();
    expect(screen.getByLabelText(`${LONG_TITLE}, 0 cards`)).toBeTruthy();
    expect(screen.getByLabelText('Helmet of Salvation, 2 cards')).toBeTruthy();
    expect(screen.queryByText('Other set verse.')).toBeNull();
    expect(screen.queryByText(/Review Due/)).toBeNull();
    expect(screen.queryByText(/Scripture List/)).toBeNull();

    const labels = screen
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel as string);
    expect(labels).toEqual([
      'Study All Material, 2 cards',
      `${LONG_TITLE}, 0 cards`,
      'Helmet of Salvation, 2 cards',
      'View All Material',
    ]);
  });

  it('launches the full material set and returns to the hub', async () => {
    await renderHub();

    fireEvent.press(screen.getByTestId('study-all-material'));
    expect(await screen.findByLabelText('Alpha walks.')).toBeTruthy();
    expect(screen.getByText('Experienced')).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.queryByLabelText('Other set verse.')).toBeNull();

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
  });

  it('studies one section and applies category filters inside that section', async () => {
    await renderHub();
    fireEvent.press(screen.getByTestId('study-section-helmet'));

    expect(await screen.findByLabelText('Alpha walks.')).toBeTruthy();
    expect(screen.getByText('Helmet of Salvation')).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.queryByLabelText('Other set verse.')).toBeNull();

    fireEvent.press(screen.getByLabelText('Study settings'));
    expect(await screen.findByLabelText('Filter 1x Frequency')).toBeTruthy();
    expect(screen.getByLabelText('Filter 5x Frequency')).toBeTruthy();
    expect(screen.getAllByText('1x Frequency').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Animals')).toBeNull();
    expect(screen.queryByText('1x Keyword')).toBeNull();
    expect(screen.queryByText('/')).toBeNull();

    fireEvent.press(screen.getByLabelText('Filter Unique Beginning'));
    await waitFor(() => {
      expect(screen.getByText('1/1')).toBeTruthy();
    });
    expect(screen.getByLabelText('Alpha walks.')).toBeTruthy();
    expect(screen.queryByLabelText('Beta speaks.')).toBeNull();

    fireEvent.press(screen.getByLabelText('Clear category filters'));
    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('study-section-prepare'));
    expect(await screen.findByTestId('study-empty-section')).toBeTruthy();
    expect(screen.getByText('This section has no cards.')).toBeTruthy();
    expect(screen.queryByLabelText('Alpha walks.')).toBeNull();
  });

  it('does not fall back to Study All for an unknown section', async () => {
    await renderHub();
    await waitFor(() => {
      expect(navigationRef.isReady()).toBe(true);
    });
    navigationRef.navigate('FlashcardStudy', { sectionId: 'missing-section' });

    expect(await screen.findByTestId('study-unknown-section')).toBeTruthy();
    expect(screen.getByText("This section isn't available")).toBeTruthy();
    expect(screen.queryByLabelText('Alpha walks.')).toBeNull();
    expect(screen.queryByText('Study All Material')).toBeNull();

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
  });

  it('keeps Study All title and count at 4.5:1 pressed and unpressed', async () => {
    await renderHub();

    const card = screen.getByTestId('study-all-material');
    const styleProp = pressStyleFromInstance(card);
    expect(typeof styleProp).toBe('function');

    const backdrop = pageBackdrop(card);
    const aboveCard = ancestorOpacity(card);
    expect(backdrop).toBe(colors.background);

    const assertOpaqueContrast = (cardStyle: ViewStyle) => {
      expect(cardStyle.backgroundColor).toBe(colors.accent);
      expect(cardStyle.opacity ?? 1).toBe(1);

      const titleStyle = StyleSheet.flatten(within(card).getByText('Study All Material').props.style);
      const countStyle = StyleSheet.flatten(within(card).getByText('2 cards').props.style);
      expect(titleStyle.color).toBe(colors.navy);
      expect(countStyle.color).toBe(colors.navy);
      expect(countStyle.fontSize).toBe(14);

      for (const textStyle of [titleStyle, countStyle]) {
        const opacity = styleOpacity(cardStyle) * styleOpacity(textStyle) * aboveCard;
        expect(opacity).toBe(1);
        const foreground = compositeHex(String(textStyle.color), backdrop, opacity);
        const background = compositeHex(String(cardStyle.backgroundColor), backdrop, opacity);
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(foreground, background)).toBeCloseTo(4.510162894666714, 10);
      }
    };

    if (typeof styleProp === 'function') {
      assertOpaqueContrast(flattenPressStyle(styleProp, false));
      assertOpaqueContrast(flattenPressStyle(styleProp, true));
    }
    assertOpaqueContrast(StyleSheet.flatten(card.props.style) ?? {});

    const event = studyAllPressEvent();
    await fireEvent(card, 'pressIn', event);
    await fireEvent(card, 'responderGrant', event);

    const pressedHost = StyleSheet.flatten(card.props.style) ?? {};
    assertOpaqueContrast(pressedHost);
    if (typeof styleProp === 'function') {
      const pressedCallback = flattenPressStyle(styleProp, true);
      expect(pressedHost.opacity ?? 1).toBe(pressedCallback.opacity ?? 1);
      expect(pressedHost.backgroundColor).toBe(pressedCallback.backgroundColor);
      expect(pressedHost.borderColor).toBe(pressedCallback.borderColor);
      expect(pressedCallback.borderColor).toBe(colors.navy);
    }

    // Release without activating onPress. Terminate still schedules press-out.
    await fireEvent(card, 'responderTerminate', event);
    await waitFor(() => {
      expect(StyleSheet.flatten(card.props.style)?.borderColor).toBe(colors.accent);
    });

  });

  it('keeps section title and count at 4.5:1 pressed and unpressed', async () => {
    await renderHub();

    const card = screen.getByTestId('study-section-helmet');
    const styleProp = pressStyleFromInstance(card);
    expect(typeof styleProp).toBe('function');

    const backdrop = pageBackdrop(card);
    const aboveCard = ancestorOpacity(card);
    expect(backdrop).toBe(colors.background);

    const assertOpaqueContrast = (cardStyle: ViewStyle) => {
      expect(cardStyle.backgroundColor).toBe(colors.cardWhite);
      expect(cardStyle.opacity ?? 1).toBe(1);

      const titleStyle = StyleSheet.flatten(within(card).getByText('Helmet of Salvation').props.style);
      const countStyle = StyleSheet.flatten(within(card).getByText('2 cards').props.style);
      expect(titleStyle.color).toBe(colors.textPrimary);
      expect(countStyle.color).toBe(colors.textSecondary);
      expect(countStyle.fontSize).toBe(14);

      const titleOpacity = styleOpacity(cardStyle) * styleOpacity(titleStyle) * aboveCard;
      const countOpacity = styleOpacity(cardStyle) * styleOpacity(countStyle) * aboveCard;
      expect(titleOpacity).toBe(1);
      expect(countOpacity).toBe(1);

      const titleForeground = compositeHex(String(titleStyle.color), backdrop, titleOpacity);
      const countForeground = compositeHex(String(countStyle.color), backdrop, countOpacity);
      const background = compositeHex(String(cardStyle.backgroundColor), backdrop, titleOpacity);
      expect(contrastRatio(titleForeground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(countForeground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(titleForeground, background)).toBeCloseTo(15.537529558868556, 8);
      expect(contrastRatio(countForeground, background)).toBeCloseTo(4.834490081424352, 8);
    };

    if (typeof styleProp === 'function') {
      assertOpaqueContrast(flattenPressStyle(styleProp, false));
      assertOpaqueContrast(flattenPressStyle(styleProp, true));
      expect(flattenPressStyle(styleProp, true).borderColor).toBe(colors.navy);
      expect(flattenPressStyle(styleProp, true).opacity ?? 1).toBe(1);
    }

    const event = studyAllPressEvent();
    await fireEvent(card, 'pressIn', event);
    await fireEvent(card, 'responderGrant', event);
    const pressedHost = StyleSheet.flatten(card.props.style) ?? {};
    assertOpaqueContrast(pressedHost);
    expect(pressedHost.borderColor).toBe(colors.navy);

    await fireEvent(card, 'responderTerminate', event);
    await waitFor(() => {
      expect(StyleSheet.flatten(card.props.style)?.borderColor).toBe(colors.border);
    });

    const viewAll = screen.getByTestId('view-all-material');
    expect(viewAll.props.accessibilityState?.disabled).not.toBe(true);
    const viewAllStyle = pressStyleFromInstance(viewAll);
    expect(typeof viewAllStyle).toBe('function');
    if (typeof viewAllStyle === 'function') {
      for (const pressed of [false, true]) {
        const buttonStyle = flattenPressStyle(viewAllStyle, pressed);
        expect(buttonStyle.backgroundColor).toBe(colors.cardWhite);
        expect(buttonStyle.opacity ?? 1).toBe(1);
        const titleStyle = StyleSheet.flatten(within(viewAll).getByText('View All Material').props.style);
        const copyStyle = StyleSheet.flatten(
          within(viewAll).getByText('Read every verse in this material').props.style,
        );
        expect(titleStyle.color).toBe(colors.textPrimary);
        expect(copyStyle.color).toBe(colors.textSecondary);
        const background = compositeHex(String(buttonStyle.backgroundColor), colors.background, 1);
        expect(contrastRatio(String(titleStyle.color), background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(String(copyStyle.color), background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(flattenPressStyle(viewAllStyle, true).borderColor).toBe(colors.navy);
    }
  });
});
