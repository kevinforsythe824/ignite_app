import { parseEligibilityAgeInput } from '../../../../src/features/season/utils/parseEligibilityAgeInput';

describe('parseEligibilityAgeInput', () => {
  it('treats empty and whitespace as empty', () => {
    expect(parseEligibilityAgeInput('')).toEqual({ status: 'empty' });
    expect(parseEligibilityAgeInput('   ')).toEqual({ status: 'empty' });
  });

  it('parses whole numbers without collapsing decimals', () => {
    expect(parseEligibilityAgeInput('1')).toEqual({ status: 'integer', age: 1 });
    expect(parseEligibilityAgeInput('2')).toEqual({ status: 'integer', age: 2 });
    expect(parseEligibilityAgeInput(' 16 ')).toEqual({ status: 'integer', age: 16 });
    expect(parseEligibilityAgeInput('19')).toEqual({ status: 'integer', age: 19 });
    expect(parseEligibilityAgeInput('2.5')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('2.0')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('02')).toEqual({ status: 'notInteger' });
  });

  it('rejects nonnumeric and non-finite text', () => {
    expect(parseEligibilityAgeInput('ten')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('1e2')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('+3')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('NaN')).toEqual({ status: 'notInteger' });
    expect(parseEligibilityAgeInput('Infinity')).toEqual({ status: 'notInteger' });
  });
});
