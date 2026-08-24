import { deriveInitials } from '../../../src/features/profile/utils/deriveInitials';

describe('deriveInitials', () => {
  it('uses first grapheme of first and last name', () => {
    expect(deriveInitials('Test', 'Quizzer')).toBe('TQ');
  });

  it('supports Unicode names', () => {
    expect(deriveInitials('José', 'García')).toBe('JG');
    expect(deriveInitials('安', '娜')).toBe('安娜');
  });

  it('trims whitespace before deriving', () => {
    expect(deriveInitials('  Ada  ', '  Lovelace  ')).toBe('AL');
  });

  it('falls back to a single initial when one name is empty', () => {
    expect(deriveInitials('Ada', '')).toBe('A');
    expect(deriveInitials('', 'Lovelace')).toBe('L');
  });

  it('uses defensive fallback when both are empty', () => {
    expect(deriveInitials('', '')).toBe('?');
    expect(deriveInitials('   ', '   ')).toBe('?');
  });
});
