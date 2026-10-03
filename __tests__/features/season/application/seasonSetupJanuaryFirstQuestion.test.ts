import { seasonSetupJanuaryFirstQuestion } from '../../../../src/features/season/application/seasonSetupJanuaryFirstQuestion';

describe('seasonSetupJanuaryFirstQuestion', () => {
  it('asks will or were from the season id and calendar date', () => {
    expect(seasonSetupJanuaryFirstQuestion('2032', '2031-12-31')).toEqual({
      status: 'question',
      text: 'How old will you be on January 1, 2032?',
    });
    expect(seasonSetupJanuaryFirstQuestion('2032', '2032-10-01')).toEqual({
      status: 'question',
      text: 'How old were you on January 1, 2032?',
    });
  });

  it('fails closed on a malformed season id or calendar date', () => {
    expect(seasonSetupJanuaryFirstQuestion('season-x', '2032-10-01')).toEqual({
      status: 'invalid',
      reason: 'seasonYear',
    });
    expect(seasonSetupJanuaryFirstQuestion('2032', '2032-10-01T00:00:00Z')).toEqual({
      status: 'invalid',
      reason: 'calendarDate',
    });
  });
});
