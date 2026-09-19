import type { Card, CardMatchedRule } from '../domain/card';
import type { Verse } from '../types/verse';
import type { FixtureCardRecord, FixtureMatchedRule } from './fixtureCardRecord';

function mapMatchedRule(rule: FixtureMatchedRule): CardMatchedRule {
  return {
    ruleName: rule.rule_name,
    ruleCategory: rule.rule_category,
    notes: rule.notes,
  };
}

/**
 * Maps one JSON fixture record to the application-owned Card domain model.
 * `cardNumber` is 1-based position in the fixture (not a JSON field).
 */
export function mapFixtureToCard(
  record: FixtureCardRecord,
  seasonId: string,
  materialSetId: string,
  cardNumber: number,
): Card {
  return {
    seasonId,
    materialSetId,
    cardId: record.id,
    cardNumber,
    reference: record.reference,
    verseText: record.verse_text,
    indexCode: record.index_code,
    matchedRules: record.matched_rules.map(mapMatchedRule),
    tags: [...record.tags],
  };
}

/** Maps a fixture array in order; cardNumber is 1-based index. */
export function mapFixturesToCards(
  records: readonly FixtureCardRecord[],
  seasonId: string,
  materialSetId: string,
): Card[] {
  return records.map((record, index) =>
    mapFixtureToCard(record, seasonId, materialSetId, index + 1),
  );
}

function matchedRulesToParseInput(rules: readonly CardMatchedRule[]): Verse['matched_rules'] {
  return rules.map((rule) => ({
    rule_name: rule.ruleName,
    rule_category: rule.ruleCategory,
    notes: rule.notes,
  }));
}

/**
 * Adapter for the existing parser. Does not change parseVerseToSegments.
 * Stage 3 will use this when session state switches from Verse to Card.
 */
export function cardToParseInput(card: Card): Verse {
  return {
    id: card.cardId,
    reference: card.reference,
    verse_text: card.verseText,
    index_code: card.indexCode,
    matched_rules: matchedRulesToParseInput(card.matchedRules),
    tags: [...card.tags],
  };
}
