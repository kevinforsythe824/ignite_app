import { colors, radius, typography } from '../../src/shared/theme';
import { spacing } from '../../src/shared/theme/spacing';

describe('Batch 0 semantic theme tokens', () => {
  it('locks semantic color hex literals independently of domain keys', () => {
    expect(colors.background).toBe('#F5F5F7');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.textPrimary).toBe('#0A2540');
    expect(colors.textSecondary).toBe('#6B7280');
    expect(colors.textMuted).toBe('#9CA3AF');
    expect(colors.accent).toBe('#E85D4A');
    expect(colors.danger).toBe('#EF4444');
    expect(colors.dangerSoft).toBe('#FEE2E2');
    expect(colors.success).toBe('#22C55E');
    expect(colors.successSoft).toBe('#DCFCE7');
    expect(colors.border).toBe('#E5E7EB');
    expect(colors.disabledBackground).toBe('#E5E7EB');
    expect(colors.disabledText).toBe('#9CA3AF');
  });

  it('keeps legacy and domain color values unchanged', () => {
    expect(colors.navy).toBe('#0A2540');
    expect(colors.accentRed).toBe('#E85D4A');
    expect(colors.brandWarmBackground).toBe('#F7F3EE');
    expect(colors.cardWhite).toBe('#FFFFFF');
    expect(colors.borderLight).toBe('#E5E7EB');
    expect(colors.practicingRed).toBe('#EF4444');
    expect(colors.practicingRedBg).toBe('#FEE2E2');
    expect(colors.masteredGreen).toBe('#22C55E');
    expect(colors.masteredGreenBg).toBe('#DCFCE7');
    expect(colors.markQuestion).toBe('#C81E1E');
  });

  it('adds semantic typography, spacing, and radius roles', () => {
    expect(typography.screenTitle.fontSize).toBe(28);
    expect(typography.stackTitle.fontSize).toBe(18);
    expect(typography.sectionTitle.fontSize).toBe(18);
    expect(typography.cardTitle.fontSize).toBe(16);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.bodySecondary.fontSize).toBe(14);
    expect(typography.label.fontSize).toBe(13);
    expect(typography.action.fontSize).toBe(16);
    expect(typography.input.fontSize).toBe(16);
    expect(typography.helper.fontSize).toBe(13);
    expect(typography.error.fontSize).toBe(13);
    expect(typography.error.color).toBe(colors.danger);

    expect(spacing.minTouchTarget).toBe(44);
    expect(spacing.sectionGap).toBe(24);
    expect(spacing.formFieldGap).toBe(16);
    expect(spacing.rowGap).toBe(12);

    expect(radius.control).toBe(8);
    expect(radius.card).toBe(16);
    expect(radius.pill).toBe(20);
    expect(radius.badge).toBe(8);
  });
});

describe('Auth Brand Mode theme tokens', () => {
  it('locks Auth Brand color hex literals', () => {
    expect(colors.authBackgroundStart).toBe('#FFF5F0');
    expect(colors.authBackgroundEnd).toBe('#FFFBFA');
    expect(colors.authAccent).toBe('#D04925');
  });

  it('does not change Main Product semantic color keys', () => {
    expect(colors.background).toBe('#F5F5F7');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.textPrimary).toBe('#0A2540');
    expect(colors.textSecondary).toBe('#6B7280');
    expect(colors.textMuted).toBe('#9CA3AF');
    expect(colors.accent).toBe('#E85D4A');
    expect(colors.danger).toBe('#EF4444');
    expect(colors.dangerSoft).toBe('#FEE2E2');
    expect(colors.success).toBe('#22C55E');
    expect(colors.successSoft).toBe('#DCFCE7');
    expect(colors.border).toBe('#E5E7EB');
    expect(colors.disabledBackground).toBe('#E5E7EB');
    expect(colors.disabledText).toBe('#9CA3AF');
  });

  it('does not add deferred Auth-only surface/border/soft tokens', () => {
    expect(colors).not.toHaveProperty('authAccentSoft');
    expect(colors).not.toHaveProperty('authSurface');
    expect(colors).not.toHaveProperty('authBorder');
  });
});
