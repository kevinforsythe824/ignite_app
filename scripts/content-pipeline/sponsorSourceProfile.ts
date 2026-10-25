import type { DivisionId } from '../../src/features/season/domain/division';

/**
 * One MaterialSet a sponsor workbook will feed later.
 * Slice A records the association only. It does not build MaterialSet records.
 */
export interface SponsorMaterialSetTarget {
  readonly divisionId: DivisionId;
  readonly materialSetId: string;
}

/**
 * One official workbook in a sponsor profile.
 * Adding a workbook, including a future Cadet file, is another entry here.
 * The Verse List reader does not branch on these file names.
 */
export interface SponsorWorkbookSource {
  readonly sourceId: string;
  /** Base file name. The reader resolves it inside the caller-supplied directory. */
  readonly fileName: string;
  readonly materialSets: readonly SponsorMaterialSetTarget[];
}

/** Sponsor workbooks for one season. Data, not a parser. */
export interface SponsorSourceProfile {
  readonly seasonId: string;
  readonly sources: readonly SponsorWorkbookSource[];
}

/**
 * Official 2027 workbooks that are present locally.
 * Senior is one source with two MaterialSet targets.
 * Cadet is intentionally absent until its workbook exists.
 */
export const WPFBQ_2027_SPONSOR_PROFILE = {
  seasonId: '2027',
  sources: [
    {
      sourceId: 'beginner',
      fileName: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
    },
    {
      sourceId: 'junior',
      fileName: 'WPFBQ_2027_Junior_Data_Workbook.xlsx',
      materialSets: [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
    },
    {
      sourceId: 'senior',
      fileName: 'WPFBQ_2027_Senior_Data_Workbook.xlsx',
      materialSets: [
        { divisionId: 'intermediate', materialSetId: 'intermediate-2027' },
        { divisionId: 'experienced', materialSetId: 'experienced-2027' },
      ],
    },
  ],
} as const satisfies SponsorSourceProfile;

/**
 * Future Cadet source. Describing this object does not read a file and does not
 * invent Cadet cards. The three-workbook profile above does not include it.
 */
export const WPFBQ_2027_CADET_WORKBOOK_SOURCE = {
  sourceId: 'cadet',
  fileName: 'WPFBQ_2027_Cadet_Data_Workbook.xlsx',
  materialSets: [{ divisionId: 'cadet', materialSetId: 'cadet-2027' }],
} as const satisfies SponsorWorkbookSource;
