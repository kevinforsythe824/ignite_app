import { getDivisionLabel } from '../../../../src/features/season/domain/division';
import { resolveParticipationOptions } from '../../../../src/features/season/domain/eligibility/resolveParticipationOptions';
import {
  resolveStudyTrackChoices,
  type SeasonSetupStudyTrackOption,
} from '../../../../src/features/season/utils/resolveStudyTrackChoices';

const FIXTURES: readonly SeasonSetupStudyTrackOption[] = [
  { materialSetId: 'fixture-study-experienced', divisionId: 'experienced' },
  { materialSetId: 'fixture-study-cadet', divisionId: 'cadet' },
  { materialSetId: 'fixture-study-intermediate', divisionId: 'intermediate' },
  { materialSetId: 'fixture-study-beginner', divisionId: 'beginner' },
  { materialSetId: 'fixture-study-junior', divisionId: 'junior' },
];

const STUDY_TRACK_AGE = 25;

describe('resolveStudyTrackChoices', () => {
  it('keeps injected opaque ids and official labels in resolver order', () => {
    const resolved = resolveStudyTrackChoices(STUDY_TRACK_AGE, FIXTURES);
    const allowed = resolveParticipationOptions({ eligibilityAge: STUDY_TRACK_AGE });
    expect(allowed.status).toBe('eligible');
    if (allowed.status !== 'eligible') {
      return;
    }

    expect(resolved).toEqual({
      status: 'ready',
      choices: allowed.allowedDivisionIds.map((divisionId) => {
        const injected = FIXTURES.find((option) => option.divisionId === divisionId);
        return {
          divisionId,
          label: getDivisionLabel(divisionId),
          materialSetId: injected?.materialSetId,
        };
      }),
    });
  });

  it('fails closed when the catalog is missing, short, duplicated, or malformed', () => {
    expect(resolveStudyTrackChoices(STUDY_TRACK_AGE, null).status).toBe('unavailable');
    expect(resolveStudyTrackChoices(STUDY_TRACK_AGE, undefined).status).toBe('unavailable');
    expect(resolveStudyTrackChoices(null, FIXTURES).status).toBe('unavailable');
    expect(resolveStudyTrackChoices(10, FIXTURES).status).toBe('unavailable');
    expect(resolveStudyTrackChoices(STUDY_TRACK_AGE, FIXTURES.slice(0, 4)).status).toBe(
      'unavailable',
    );
    expect(
      resolveStudyTrackChoices(
        STUDY_TRACK_AGE,
        FIXTURES.map((option) =>
          option.divisionId === 'junior'
            ? { ...option, materialSetId: 'fixture-study-cadet' }
            : option,
        ),
      ).status,
    ).toBe('unavailable');
    expect(
      resolveStudyTrackChoices(
        STUDY_TRACK_AGE,
        FIXTURES.map((option) =>
          option.divisionId === 'junior' ? { ...option, divisionId: 'cadet' } : option,
        ),
      ).status,
    ).toBe('unavailable');
    expect(
      resolveStudyTrackChoices(
        STUDY_TRACK_AGE,
        FIXTURES.map((option) =>
          option.divisionId === 'junior' ? { ...option, materialSetId: 'bad/id' } : option,
        ),
      ).status,
    ).toBe('unavailable');
    expect(
      resolveStudyTrackChoices(
        STUDY_TRACK_AGE,
        FIXTURES.map((option) =>
          option.divisionId === 'junior' ? { ...option, divisionId: 'senior' } : option,
        ),
      ).status,
    ).toBe('unavailable');
  });
});
