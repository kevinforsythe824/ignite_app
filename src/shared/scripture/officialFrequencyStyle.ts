import { colors } from '../theme';
import type { OfficialFrequencyTier } from './segmentOfficialAnnotations';

/**
 * One map from frequency tier to the official tier color.
 * Legacy keyword1x–keyword3x stay on the theme for matchedRules.
 */
export const officialFrequencyTextColor: Record<OfficialFrequencyTier, string> = {
  1: colors.officialFrequency1,
  2: colors.officialFrequency2,
  3: colors.officialFrequency3,
  4: colors.officialFrequency4,
  5: colors.officialFrequency5,
};

/**
 * Unicode superscript digits. React Native Text has no superscript style.
 * The glyph is already raised, so it can sit in the verse line without a
 * separating space and without joining the canonical run text.
 */
export const FREQUENCY_SUPERSCRIPT_GLYPH: Record<OfficialFrequencyTier, string> = {
  1: '\u00B9',
  2: '\u00B2',
  3: '\u00B3',
  4: '\u2074',
  5: '\u2075',
};
