import type { DivisionId } from '../../src/features/season/domain/division';

/**
 * One MaterialSet a sponsor workbook feeds.
 * The profile lists the association. Mapping copies each verse list once per target.
 */
export interface SponsorMaterialSetTarget {
  readonly divisionId: DivisionId;
  readonly materialSetId: string;
}

/**
 * One official workbook in a sponsor profile.
 * Adding a workbook is another entry here.
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
 * Cadet workbook. The 2027 profile below references this object.
 * Describing it does not read a file.
 */
export const WPFBQ_2027_CADET_WORKBOOK_SOURCE = {
  sourceId: 'cadet',
  fileName: 'WPFBQ_2027_Cadet_Data_Workbook.xlsx',
  materialSets: [{ divisionId: 'cadet', materialSetId: 'cadet-2027' }],
} as const satisfies SponsorWorkbookSource;

/**
 * Official 2027 workbooks.
 * Order is Cadet, Beginner, Junior, then Senior.
 * Senior is one source with two MaterialSet targets and is read once.
 */
export const WPFBQ_2027_SPONSOR_PROFILE = {
  seasonId: '2027',
  sources: [
    WPFBQ_2027_CADET_WORKBOOK_SOURCE,
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
