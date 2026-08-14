/**
 * Shape of `src/data/mock-verse-data.json`.
 * Fixture-only — never use this as the Card domain model.
 */
export interface FixtureMatchedRule {
  rule_name: string;
  rule_category: string;
  notes: string;
}

export interface FixtureCardRecord {
  id: string;
  reference: string;
  verse_text: string;
  index_code: string;
  matched_rules: FixtureMatchedRule[];
  tags: string[];
}
