import { contrastRatio, parseSrgbHex, relativeLuminance } from '../test-utils/relativeLuminanceContrast';
import { colors } from '../src/shared/theme';

/**
 * Flashcard Locate scripture sits on `colors.cardWhite`, not the screen canvas.
 * Tier 3 must clear WCAG AA 4.5:1 on that surface. Legacy keyword3x stays put.
 */
describe('official frequency tier 3 contrast', () => {
  it('measures sRGB relative luminance against the flashcard surface', () => {
    expect(parseSrgbHex('#C4600A')).toEqual({ r: 196, g: 96, b: 10 });
    expect(parseSrgbHex('#BE5A0A')).toEqual({ r: 190, g: 90, b: 10 });
    expect(parseSrgbHex(colors.cardWhite)).toEqual({ r: 255, g: 255, b: 255 });

    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(relativeLuminance(colors.cardWhite)).toBe(1);
    expect(relativeLuminance('#C4600A')).toBeCloseTo(0.20123419202446044, 12);
    expect(relativeLuminance('#BE5A0A')).toBeCloseTo(0.18281392964578078, 12);

    const approvedOrangeOnWhite = contrastRatio('#C4600A', '#FFFFFF');
    const tier3OnCard = contrastRatio(colors.officialFrequency3, colors.cardWhite);

    expect(approvedOrangeOnWhite).toBeCloseTo(4.179367432191597, 10);
    expect(approvedOrangeOnWhite).toBeLessThan(4.5);
    expect(colors.officialFrequency3).toBe('#BE5A0A');
    expect(colors.cardWhite).toBe('#FFFFFF');
    expect(tier3OnCard).toBeCloseTo(4.5100394190224895, 10);
    expect(tier3OnCard).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves the other official tiers and legacy keyword colors unchanged', () => {
    expect(colors.officialFrequency1).toBe('#1F4E9C');
    expect(colors.officialFrequency2).toBe('#1E7A32');
    expect(colors.officialFrequency4).toBe('#6B2FA0');
    expect(colors.officialFrequency5).toBe('#7A4A22');
    expect(colors.keyword1x).toBe('#3B82F6');
    expect(colors.keyword2x).toBe('#15803D');
    expect(colors.keyword3x).toBe('#EA580C');
    expect(colors.keyword3x).not.toBe(colors.officialFrequency3);
  });
});
