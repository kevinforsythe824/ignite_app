import React, { useMemo } from 'react';
import { SectionList, StyleSheet } from 'react-native';

import { colors, spacing } from '../../../shared/theme';
import type { Card } from '../../flashcards/domain/card';
import type { AnnotatedScriptureSection } from '../domain/projectAnnotatedScriptureList';
import { AnnotatedScriptureSectionHeader } from './AnnotatedScriptureSectionHeader';
import { AnnotatedScriptureVerse } from './AnnotatedScriptureVerse';

/**
 * Windowing for a long scripture document. These are list tuning values,
 * not curriculum sizes.
 */
const SCRIPTURE_LIST_INITIAL_RENDER = 8;
const SCRIPTURE_LIST_RENDER_BATCH = 8;
const SCRIPTURE_LIST_WINDOW_SIZE = 7;
const SCRIPTURE_LIST_BATCH_PERIOD_MS = 50;

interface ScriptureDocumentSection {
  key: string;
  sectionId: string;
  title: string;
  count: number;
  data: readonly Card[];
}

function scriptureItemKey(card: Card): string {
  return `${card.seasonId}:${card.materialSetId}:${card.cardId}`;
}

function renderScriptureItem({ item }: { item: Card }): React.JSX.Element {
  return <AnnotatedScriptureVerse card={item} />;
}

function renderScriptureSectionHeader({
  section,
}: {
  section: ScriptureDocumentSection;
}): React.JSX.Element {
  return (
    <AnnotatedScriptureSectionHeader
      sectionId={section.sectionId}
      title={section.title}
      count={section.count}
    />
  );
}

export interface AnnotatedScriptureDocumentProps {
  seasonId: string;
  materialSetId: string;
  sections: readonly AnnotatedScriptureSection[];
}

/** Virtualized reading surface. Item keys include Season and MaterialSet. */
export function AnnotatedScriptureDocument({
  seasonId,
  materialSetId,
  sections,
}: AnnotatedScriptureDocumentProps): React.JSX.Element {
  const listSections = useMemo<ScriptureDocumentSection[]>(
    () =>
      sections.map((entry) => ({
        key: `${entry.section.seasonId}:${entry.section.materialSetId}:${entry.section.sectionId}`,
        sectionId: entry.section.sectionId,
        title: entry.section.title,
        count: entry.cards.length,
        data: entry.cards,
      })),
    [sections],
  );

  return (
    <SectionList
      key={`${seasonId}:${materialSetId}`}
      testID="annotated-scripture-list"
      sections={listSections}
      keyExtractor={scriptureItemKey}
      renderItem={renderScriptureItem}
      renderSectionHeader={renderScriptureSectionHeader}
      stickySectionHeadersEnabled={false}
      initialNumToRender={SCRIPTURE_LIST_INITIAL_RENDER}
      maxToRenderPerBatch={SCRIPTURE_LIST_RENDER_BATCH}
      windowSize={SCRIPTURE_LIST_WINDOW_SIZE}
      updateCellsBatchingPeriod={SCRIPTURE_LIST_BATCH_PERIOD_MS}
      removeClippedSubviews={false}
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.cardWhite,
  },
  content: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.cardWhite,
  },
});
