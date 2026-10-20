import {
  STANDARD_ACCOUNT_MIN_CURRENT_AGE,
  parsePrivacyAgeInput,
  resolvePrivacyAgeRoute,
} from '../../../src/features/auth/validation/privacyAgeValidation';

describe('privacyAgeValidation', () => {
  it('exposes the standard account minimum current age constant as 13', () => {
    expect(STANDARD_ACCOUNT_MIN_CURRENT_AGE).toBe(13);
  });

  it('rejects empty and whitespace-only input', () => {
    expect(parsePrivacyAgeInput('')).toEqual({ status: 'empty' });
    expect(parsePrivacyAgeInput('   ')).toEqual({ status: 'empty' });
  });

  it('parses valid under-13 ages and routes them to under13', () => {
    for (const [raw, expectedAge] of [
      ['0', 0],
      ['1', 1],
      ['8', 8],
      ['12', 12],
      [' 12 ', 12],
    ] as const) {
      const parsed = parsePrivacyAgeInput(raw);
      expect(parsed).toEqual({ status: 'integer', age: expectedAge });
      if (parsed.status === 'integer') {
        expect(resolvePrivacyAgeRoute(parsed.age)).toBe('under13');
      }
    }
  });

  it('parses valid standard ages (13 and older, with no upper cap) and routes them to standard', () => {
    for (const [raw, expectedAge] of [
      ['13', 13],
      ['16', 16],
      ['19', 19],
      ['35', 35],
      [' 13 ', 13],
      [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
    ] as const) {
      const parsed = parsePrivacyAgeInput(raw);
      expect(parsed).toEqual({ status: 'integer', age: expectedAge });
      if (parsed.status === 'integer') {
        expect(resolvePrivacyAgeRoute(parsed.age)).toBe('standard');
      }
    }
  });

  it('rejects decimals, negatives, leading zeros, mixed text, scientific notation, and unsafe integers', () => {
    for (const invalid of [
      '12.5',
      '12.0',
      '-1',
      '+13',
      '01',
      '00',
      '12abc',
      'abc',
      '1e2',
      '1 2',
      'NaN',
      'Infinity',
      '9007199254740992',
    ]) {
      expect(parsePrivacyAgeInput(invalid)).toEqual({ status: 'notInteger' });
    }
  });
});
