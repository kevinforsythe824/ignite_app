import type { DivisionId } from './division';

/**
 * Independent official curriculum boundary inside a Season (PRD §§12.1, 12.3).
 * One official MaterialSet per Division per Season (1:1 MVP).
 * No parentMaterialSetId — sets are not subsets of each other.
 */
export interface MaterialSet {
  seasonId: string;
  materialSetId: string;
  /** Which official division this set serves. */
  divisionId: DivisionId;
  displayName: string;
}
